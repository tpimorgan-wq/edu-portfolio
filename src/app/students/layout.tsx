import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout'

export default function StudentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>
}
