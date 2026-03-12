import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>
}
