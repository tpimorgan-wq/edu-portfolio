import { getClientFirestore } from './config'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc as fsUpdateDoc,
  deleteDoc as fsDeleteDoc,
  query,
  where,
  orderBy,
  limit as fsLimit,
  QueryConstraint,
} from 'firebase/firestore'

// ── Types ──────────────────────────────────────────────────
interface QueryResult<T = any> {
  data: T
  error: { message: string } | null
  count?: number | null
}

type WhereOp = '==' | '>=' | '<=' | '>' | '<' | '!='

// ── Relationship parser ────────────────────────────────────
// Parses Supabase-style select strings:
//   "*, consultant:consultant_id(full_name, email)"
//   "*, students(name)"
interface Relation {
  alias: string           // "consultant" or "students"
  foreignKey: string      // "consultant_id" or "student_id" (inferred)
  targetCollection: string // "profiles" or "students"
  fields: string[]        // ["full_name", "email"]
}

function parseRelations(selectStr: string): Relation[] {
  const relations: Relation[] = []
  // Pattern: alias:foreignKey(fields) or table(fields)
  const regex = /(\w+)(?::(\w+))?\(([^)]+)\)/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(selectStr)) !== null) {
    const alias = m[1]
    const foreignKey = m[2] || `${alias.replace(/s$/, '')}_id` // "students" → "student_id"
    const fields = m[3].split(',').map(f => f.trim())

    // Map alias to collection name
    let targetCollection = alias
    if (m[2]) {
      // Has explicit foreignKey like consultant:consultant_id → target is "profiles"
      targetCollection = 'profiles'
    }

    relations.push({ alias, foreignKey, targetCollection, fields })
  }
  return relations
}

async function resolveRelations(docs: any[], relations: Relation[]): Promise<any[]> {
  if (!relations.length) return docs

  for (const rel of relations) {
    const ids = Array.from(new Set(docs.map(d => d[rel.foreignKey]).filter(Boolean)))
    if (!ids.length) continue

    // Batch fetch related docs
    const relatedMap: Record<string, any> = {}
    for (const id of ids) {
      const snap = await getDoc(doc(getClientFirestore(), rel.targetCollection, id))
      if (snap.exists()) {
        const data = snap.data()
        const picked: any = { id: snap.id }
        for (const f of rel.fields) picked[f] = data[f] ?? null
        relatedMap[id] = picked
      }
    }

    // Attach to docs
    for (const d of docs) {
      d[rel.alias] = d[rel.foreignKey] ? relatedMap[d[rel.foreignKey]] || null : null
    }
  }
  return docs
}

// ── QueryBuilder ───────────────────────────────────────────
class QueryBuilder implements PromiseLike<QueryResult> {
  private _collection: string
  private _op: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private _insertData: any = null
  private _updateData: any = null
  private _wheres: [string, WhereOp, any][] = []
  private _orderBys: [string, 'asc' | 'desc'][] = []
  private _limitCount: number | null = null
  private _isSingle = false
  private _wantCount = false
  private _selectAfterMutation = false
  private _selectStr = '*'
  private _relations: Relation[] = []

  constructor(col: string) {
    this._collection = col
  }

  select(fields = '*', opts?: { count?: string }): this {
    if (this._op === 'insert' || this._op === 'update') {
      this._selectAfterMutation = true
    } else {
      this._op = 'select'
    }
    this._selectStr = fields
    this._relations = parseRelations(fields)
    if (opts?.count === 'exact') this._wantCount = true
    return this
  }

  insert(data: any): this {
    this._op = 'insert'
    this._insertData = data
    return this
  }

  update(data: any): this {
    this._op = 'update'
    this._updateData = data
    return this
  }

  delete(): this {
    this._op = 'delete'
    return this
  }

  eq(field: string, value: any): this {
    this._wheres.push([field, '==', value])
    return this
  }

  gte(field: string, value: any): this {
    this._wheres.push([field, '>=', value])
    return this
  }

  order(field: string, opts?: { ascending?: boolean }): this {
    this._orderBys.push([field, opts?.ascending === false ? 'desc' : 'asc'])
    return this
  }

  limit(n: number): this {
    this._limitCount = n
    return this
  }

  single(): this {
    this._isSingle = true
    return this
  }

  // Make it awaitable
  then<R1 = QueryResult, R2 = never>(
    onFulfilled?: ((v: QueryResult) => R1 | PromiseLike<R1>) | null,
    onRejected?: ((e: any) => R2 | PromiseLike<R2>) | null
  ): Promise<R1 | R2> {
    return this.execute().then(onFulfilled, onRejected) as any
  }

  // ── Execution ────────────────────────────────────────────
  private async execute(): Promise<QueryResult> {
    try {
      switch (this._op) {
        case 'select':
          return this.execSelect()
        case 'insert':
          return this.execInsert()
        case 'update':
          return this.execUpdate()
        case 'delete':
          return this.execDelete()
      }
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Unknown error' } }
    }
  }

  private async execSelect(): Promise<QueryResult> {
    const colRef = collection(getClientFirestore(), this._collection)

    // Direct document lookup: .eq('id', value).single()
    const idCond = this._wheres.find(w => w[0] === 'id' && w[1] === '==')
    if (idCond && this._wheres.length === 1 && this._isSingle) {
      const snap = await getDoc(doc(getClientFirestore(), this._collection, idCond[2]))
      if (!snap.exists()) return { data: null, error: null }
      let d = { id: snap.id, ...snap.data() }
      if (this._relations.length) [d] = await resolveRelations([d], this._relations)
      return { data: d, error: null }
    }

    // To avoid requiring composite indexes, only send a single
    // equality where clause to Firestore. Range filters and any
    // additional equality filters are applied client-side.
    const constraints: QueryConstraint[] = []
    const clientFilters: [string, WhereOp, any][] = []

    if (this._wheres.length > 0) {
      // Pick the first equality filter for Firestore
      const eqIdx = this._wheres.findIndex(w => w[1] === '==')
      if (eqIdx !== -1) {
        const [field, op, value] = this._wheres[eqIdx]
        constraints.push(where(field, op, value))
        // Rest are applied client-side
        for (let i = 0; i < this._wheres.length; i++) {
          if (i !== eqIdx) clientFilters.push(this._wheres[i])
        }
      } else {
        // No equality filter, use the first range filter in Firestore
        constraints.push(where(this._wheres[0][0], this._wheres[0][1], this._wheres[0][2]))
        for (let i = 1; i < this._wheres.length; i++) {
          clientFilters.push(this._wheres[i])
        }
      }
    }

    // Sorting is always done client-side to avoid composite indexes
    // (Firestore requires composite index for where + orderBy on different fields)

    const q = query(colRef, ...constraints)
    const snap = await getDocs(q)
    let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))

    // Apply remaining filters client-side
    for (const [field, op, value] of clientFilters) {
      docs = docs.filter(d => {
        const v = (d as any)[field]
        switch (op) {
          case '==': return v === value
          case '!=': return v !== value
          case '>=': return v >= value
          case '<=': return v <= value
          case '>':  return v > value
          case '<':  return v < value
          default:   return true
        }
      })
    }

    // Sort client-side
    if (this._orderBys.length > 0) {
      docs.sort((a, b) => {
        for (const [field, dir] of this._orderBys) {
          const va = (a as any)[field] ?? ''
          const vb = (b as any)[field] ?? ''
          if (va < vb) return dir === 'asc' ? -1 : 1
          if (va > vb) return dir === 'asc' ? 1 : -1
        }
        return 0
      })
    }

    // Apply limit client-side (since we may have filtered after fetch)
    if (this._limitCount && docs.length > this._limitCount) {
      docs = docs.slice(0, this._limitCount)
    }

    if (this._relations.length) {
      docs = await resolveRelations(docs, this._relations)
    }

    if (this._isSingle) {
      return { data: docs[0] || null, error: null }
    }

    return {
      data: docs,
      error: null,
      count: this._wantCount ? docs.length : undefined,
    }
  }

  private async execInsert(): Promise<QueryResult> {
    const data = { ...this._insertData }
    const now = new Date().toISOString()
    if (!data.created_at) data.created_at = now

    let docId: string

    if (data.id) {
      // Use provided ID as document ID (e.g. profiles use auth UID)
      docId = data.id
      await setDoc(doc(getClientFirestore(), this._collection, docId), data)
    } else {
      // Auto-generate document ID
      const ref = doc(collection(getClientFirestore(), this._collection))
      docId = ref.id
      data.id = docId
      await setDoc(ref, data)
    }

    if (this._selectAfterMutation && this._isSingle) {
      return { data, error: null }
    }
    return { data: null, error: null }
  }

  private async execUpdate(): Promise<QueryResult> {
    const idCond = this._wheres.find(w => w[0] === 'id' && w[1] === '==')
    if (!idCond) {
      return { data: null, error: { message: 'update requires .eq("id", value)' } }
    }
    const docRef = doc(getClientFirestore(), this._collection, idCond[2])
    await fsUpdateDoc(docRef, this._updateData)

    if (this._selectAfterMutation && this._isSingle) {
      const snap = await getDoc(docRef)
      return { data: snap.exists() ? { id: snap.id, ...snap.data() } : null, error: null }
    }
    return { data: null, error: null }
  }

  private async execDelete(): Promise<QueryResult> {
    const idCond = this._wheres.find(w => w[0] === 'id' && w[1] === '==')
    if (!idCond) {
      return { data: null, error: { message: 'delete requires .eq("id", value)' } }
    }
    await fsDeleteDoc(doc(getClientFirestore(), this._collection, idCond[2]))
    return { data: null, error: null }
  }
}

// ── Public API (Supabase-compatible) ───────────────────────
export function createClient() {
  return {
    from(col: string) {
      return new QueryBuilder(col)
    },
  }
}
