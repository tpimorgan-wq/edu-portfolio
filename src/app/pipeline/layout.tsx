import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout'

export default function PipelineLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>
}
