export interface User {
  id: string
  firstname: string
  lastname: string
  email: string
  avatar?: string
  role: 'student' | 'supervisor' | 'admin'
  universityId?: string
}

export type SectionType = 'cover' | 'dedication' | 'thanks' | 'abstract' | 'sigles' | 'introduction' | 'chapter' | 'conclusion' | 'bibliography' | 'annexes'
export type SectionStatus = 'valide' | 'en_cours' | 'a_corriger'

export interface Project {
  id: string
  title: string
  theme: string
  field: string
  level: 'licence' | 'master' | 'doctorat' | 'stage'
  academicYear: string
  supervisor: string
  universityId: string
  faculty: string
  cover_fields: string
  status: 'draft' | 'review' | 'submitted'
  progress: number
  lastModified: string
  sections: Section[]
  bibliography: Reference[]
}

export interface Section {
  id: string
  projectId: string
  title: string
  type: SectionType
  content: string
  orderIndex: number
  status: SectionStatus
  subsections?: SubSection[]
}

export interface SubSection {
  id: string
  title: string
  orderIndex: number
}

export interface Reference {
  id: string
  type: 'book' | 'article' | 'chapter' | 'thesis' | 'report' | 'website' | 'conference'
  authors: { firstname: string; lastname: string }[]
  title: string
  subtitle?: string
  year: number
  publisher?: string
  place?: string
  pages?: string
  doi?: string
  url?: string
  format: 'apa' | 'mla' | 'chicago' | 'iso690'
}

export interface University {
  id: string
  name: string
  country: string
  logo?: string
  cover_config?: string
}

export interface Template {
  id: string
  universityId?: string
  name: string
  level: 'licence' | 'master' | 'doctorat' | 'stage'
  description: string
  image: string
  defaultSections?: { title: string; type: SectionType; subsections?: { title: string }[] }[]
}

export type AppConfigKey = 'appName' | 'appDescription' | 'contactEmail' | 'maxProjectsFree' | 'aiSuggestionsPerDay'

export interface AppConfig {
  key: AppConfigKey
  value: string
}

export interface Comment {
  id: string
  sectionId: string
  userId: string
  userName: string
  avatar?: string
  content: string
  audioUrl?: string
  createdAt: string
  anchorText?: string
  resolved: boolean
  resolvedAt?: string
  replies: CommentReply[]
}

export interface CommentReply {
  id: string
  userId: string
  userName: string
  avatar?: string
  content: string
  audioUrl?: string
  createdAt: string
}

export interface DocumentVersion {
  id: string
  projectId: string
  label: string
  description?: string
  createdAt: string
  sections: { id: string; content: string }[]
}

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}
