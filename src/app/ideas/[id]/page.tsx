import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { IdeaWorkspace } from '@/components/workspace/idea-workspace'

interface IdeaPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function IdeaPage({ params }: IdeaPageProps) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  return <IdeaWorkspace ideaId={id} />
}