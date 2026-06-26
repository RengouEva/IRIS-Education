import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import UnderlineExtension from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import SuperscriptExtension from '@tiptap/extension-superscript'
import { Table as TableExtension } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Mark } from '@tiptap/core'
import {
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Code, Superscript,
  Table, ChevronLeft, ChevronRight, PanelLeftClose, PanelRightClose, Sparkles,
  MessageSquare, GitBranch, Plus, GripVertical, Send, FileText, BookOpen,
  Download, Search, ZoomIn, ZoomOut, Printer, ChevronDown, X, CheckCircle2,
  History, RotateCcw, Reply, CornerDownRight, Circle, CheckCheck, MessageSquarePlus, AlertCircle, ChevronUp,
  UserPlus, Users
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { VoiceRecorder, AudioPlayer } from '@/components/VoiceRecorder'
import { ShareDialog } from '@/components/ShareDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty'
import type { Section, SectionStatus, Comment, CommentReply, DocumentVersion } from '@/types'

const CommentHighlight = Mark.create({
  name: 'commentHighlight',
  addAttributes() {
    return { commentId: { default: null } }
  },
  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', { 'data-comment-id': HTMLAttributes.commentId, class: 'bg-yellow-200/40 border-b-2 border-yellow-500 cursor-pointer' }, 0]
  },
  addCommands() {
    return {
      removeCommentHighlight: (commentId: string) => ({ state, dispatch }: { state: any; dispatch: any }) => {
        const tr = state.tr
        const ranges: { from: number; to: number }[] = []
        state.doc.descendants((node: any, pos: number) => {
          if (node.marks) {
            node.marks.forEach((mark: any) => {
              if (mark.type.name === 'commentHighlight' && mark.attrs.commentId === commentId) {
                ranges.push({ from: pos, to: pos + node.nodeSize })
              }
            })
          }
        })
        if (ranges.length === 0) return false
        ranges.forEach(({ from, to }) => { tr.removeMark(from, to, state.schema.marks.commentHighlight) })
        if (dispatch) dispatch(tr)
        return true
      },
    }
  },
})

const levelLabels: Record<string, string> = {
  licence: 'Licence',
  master: 'Master',
  doctorat: 'Doctorat',
  stage: 'Rapport de stage',
}

export default function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const { projects, aiMessages, rightPanelTab, aiEnabled } = state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const project = projects.find((p) => p.id === id) || projects[0]
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    setLoading(true)
    api.projects.get(id)
      .then((data) => {
        dispatch({ type: 'UPDATE_PROJECT', project: data })
        setLoading(false)
      })
      .catch((err) => {
        if (!project) setError(err.message)
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    if (!id) return
    api.versions.list(id).then((data) => {
      data.forEach((v: any) => dispatch({ type: 'SAVE_VERSION', version: v }))
    }).catch(() => {})
    api.ai.messages(id).then((messages) => {
      dispatch({ type: 'SET_AI_MESSAGES', messages })
    }).catch(() => {})
  }, [id])

  if (error) {
    return (
      <div className="min-h-screen bg-surface-light flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-1">Erreur de chargement</h3>
          <p className="text-sm text-text-muted mb-4">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="bg-gold text-brand-900 px-4 py-2 rounded-lg text-sm font-medium">
            Retour
          </button>
        </div>
      </div>
    )
  }

  if (!loading && !project) {
    return (
      <div className="min-h-screen bg-surface-light flex items-center justify-center">
        <Empty>
          <EmptyMedia><FileText size={48} className="text-text-muted" /></EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Projet introuvable</EmptyTitle>
            <EmptyDescription>Le projet que vous recherchez n'existe pas ou a été supprimé.</EmptyDescription>
          </EmptyHeader>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gold hover:bg-gold-light text-brand-900 font-semibold px-5 py-2.5 rounded-[10px] transition-colors text-sm"
          >
            Retour au tableau de bord
          </button>
        </Empty>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-light flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="h-8 w-64 mx-auto mb-4" />
          <Skeleton className="h-[600px] w-[900px] rounded-xl" />
        </div>
      </div>
    )
  }

  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [zoom, setZoom] = useState(100)
  const [activeSection, setActiveSection] = useState<string>(project?.sections[0]?.id || '')
  const [showExport, setShowExport] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [searchMatches, setSearchMatches] = useState<{ from: number; to: number }[]>([])
  const [searchIndex, setSearchIndex] = useState(0)
  const [savedIndicator, setSavedIndicator] = useState(false)
  const [message, setMessage] = useState('')
  const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null)
  const [selectionCoords, setSelectionCoords] = useState<{ x: number; y: number } | null>(null)
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentInputValue, setCommentInputValue] = useState('')
  const [projectInfo, setProjectInfo] = useState({
    theme: project?.theme || '',
    problematique: '',
    faculty: project?.faculty || '',
    supervisor: project?.supervisor || '',
    coSupervisor: '',
    academicYear: project?.academicYear || '',
    level: project?.level || '',
  })
  const [savingInfo, setSavingInfo] = useState(false)

  useEffect(() => {
    if (project) {
      setProjectInfo({
        theme: project.theme || '',
        problematique: '',
        faculty: project.faculty || '',
        supervisor: project.supervisor || '',
        coSupervisor: '',
        academicYear: project.academicYear || '',
        level: project.level || '',
      })
    }
  }, [project?.id])

  const handleSaveProjectInfo = async () => {
    if (!project || !id) return
    setSavingInfo(true)
    try {
      const updated = await api.projects.update(id, {
        theme: projectInfo.theme,
        faculty: projectInfo.faculty,
        supervisor: projectInfo.supervisor,
        academicYear: projectInfo.academicYear,
        cover_fields: JSON.stringify({ problematique: projectInfo.problematique, faculty: projectInfo.faculty, coSupervisor: projectInfo.coSupervisor }),
      })
      dispatch({ type: 'UPDATE_PROJECT', project: updated })
      setSavedIndicator(true)
      setTimeout(() => setSavedIndicator(false), 2000)
    } catch {}
    setSavingInfo(false)
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder: 'Commencez à rédiger votre mémoire ici...' }),
      CommentHighlight,
      UnderlineExtension,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      SuperscriptExtension,
      TableExtension.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: project?.sections.find((s) => s.id === activeSection)?.content || '<p></p>',
    onUpdate: ({ editor }) => {
      if (!project) return
      dispatch({
        type: 'UPDATE_SECTION',
        projectId: project.id,
        sectionId: activeSection,
        content: editor.getHTML(),
      })
      setSavedIndicator(true)
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      autoSaveTimer.current = setTimeout(() => {
        api.projects.updateSection(project.id, activeSection, { content: editor.getHTML() }).catch(() => {})
      }, 2000)
      setTimeout(() => setSavedIndicator(false), 2000)
    },
  })

  useEffect(() => {
    if (editor && project) {
      const section = project.sections.find((s) => s.id === activeSection)
      editor.commands.setContent(section?.content || '<p></p>')
    }
  }, [activeSection, editor])

  useEffect(() => {
    if (!editor || !searchQuery.trim()) { setSearchMatches([]); return }
    const matches: { from: number; to: number }[] = []
    const query = searchQuery.toLowerCase()
    const doc = editor.state.doc
    doc.descendants((node: any, pos: number) => {
      if (node.isText) {
        const text = node.text || ''
        const textLower = text.toLowerCase()
        let idx = 0
        while ((idx = textLower.indexOf(query, idx)) !== -1) {
          matches.push({ from: pos + idx, to: pos + idx + query.length })
          idx += query.length
        }
      }
    })
    setSearchMatches(matches)
    setSearchIndex(0)
  }, [searchQuery, editor])

  const goToMatch = useCallback((idx: number) => {
    if (!editor || searchMatches.length === 0) return
    const match = searchMatches[idx]
    if (match) {
      editor.commands.setTextSelection(match)
      editor.commands.scrollIntoView()
      setSearchIndex(idx)
    }
  }, [editor, searchMatches])

  useEffect(() => {
    if (!editor) return
    const handleSelection = () => {
      const { from, to } = editor.state.selection
      if (from !== to) {
        setSelectionRange({ from, to })
        const coords = editor.view.coordsAtPos(to)
        setSelectionCoords({ x: coords.left, y: coords.top })
      } else {
        setSelectionRange(null)
        setSelectionCoords(null)
        setShowCommentInput(false)
        setCommentInputValue('')
      }
    }
    editor.on('selectionUpdate', handleSelection)
    return () => { editor.off('selectionUpdate', handleSelection) }
  }, [editor])

  const handleCreateComment = useCallback(() => {
    if (!editor || !selectionRange || !commentInputValue.trim() || !project) return
    const selectedText = editor.state.doc.textBetween(selectionRange.from, selectionRange.to)
    const commentData = {
      sectionId: activeSection,
      content: commentInputValue.trim(),
      anchorText: selectedText,
    }
    api.comments.create(commentData).then((saved) => {
      dispatch({ type: 'ADD_COMMENT', comment: saved })
      editor.chain().focus().setCommentHighlight({ commentId: saved.id }).run()
    }).catch(() => {})
    setShowCommentInput(false)
    setCommentInputValue('')
    setSelectionRange(null)
    setSelectionCoords(null)
  }, [editor, selectionRange, commentInputValue, project, activeSection, dispatch])

  const handleSendMessage = useCallback(() => {
    if (!message.trim() || !id) return
    const userMsg = { id: Date.now().toString(), role: 'user' as const, content: message, timestamp: new Date().toISOString() }
    dispatch({ type: 'ADD_AI_MESSAGE', message: userMsg })
    setMessage('')
    api.ai.chat(id, message).then((assistantMsg) => {
      dispatch({ type: 'ADD_AI_MESSAGE', message: assistantMsg })
    }).catch(() => {
      dispatch({
        type: 'ADD_AI_MESSAGE',
        message: {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Erreur : impossible de contacter l\'assistant IA.',
          timestamp: new Date().toISOString(),
        },
      })
    })
  }, [message, dispatch, id])

  if (!project) return null

  const sectionColors: Record<string, string> = {
    cover: 'text-purple-500',
    dedication: 'text-pink-500',
    thanks: 'text-rose-500',
    abstract: 'text-blue-500',
    sigles: 'text-cyan-500',
    introduction: 'text-green-500',
    chapter: 'text-gold',
    conclusion: 'text-orange-500',
    bibliography: 'text-brand-500',
    annexes: 'text-gray-500',
  }

  const quickActions = [
    'Corriger ce paragraphe',
    'Reformuler plus académiquement',
    'Générer une problématique',
    'Proposer une bibliographie',
  ]

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Top Toolbar */}
      <header className="shrink-0 border-b border-border-light bg-white">
        {/* Bar 1: File actions */}
        <div className="flex items-center justify-between px-3 h-10 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/dashboard')} className="p-1.5 text-text-muted hover:text-text-primary rounded">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-text-primary font-medium truncate max-w-[300px]">{project.title}</span>
            <span className="text-caption text-text-muted">{levelLabels[project.level]}</span>
            <button onClick={() => setShowShare(true)} className="p-1.5 text-text-muted hover:text-gold rounded transition-colors" title="Partager">
              <Users size={15} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowSearch(!showSearch)} className="p-1.5 text-text-muted hover:text-text-primary rounded"><Search size={15} /></button>
            <button className="p-1.5 text-text-muted hover:text-text-primary rounded"><ZoomOut size={15} onClick={() => setZoom(Math.max(50, zoom - 10))} /></button>
            <span className="text-caption text-text-muted w-10 text-center">{zoom}%</span>
            <button className="p-1.5 text-text-muted hover:text-text-primary rounded"><ZoomIn size={15} onClick={() => setZoom(Math.min(200, zoom + 10))} /></button>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <button onClick={() => setShowExport(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gold hover:bg-gold-light text-brand-900 text-xs font-semibold rounded-lg transition-colors">
              <Download size={14} /> Exporter
            </button>
          </div>
        </div>

        {/* Bar 2: Formatting */}
        <div className="flex items-center gap-1 px-3 h-9 overflow-x-auto">
          <select
            value={editor?.isActive('heading') ? `heading-${[1,2,3].find(l => editor.isActive('heading', { level: l })) || '0'}` : 'paragraph'}
            onChange={(e) => {
              const val = e.target.value
              if (val === 'paragraph') editor?.chain().focus().setParagraph().run()
              else editor?.chain().focus().toggleHeading({ level: parseInt(val.replace('heading-', '')) as 1|2|3 }).run()
            }}
            className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none"
          >
            <option value="paragraph">Normal</option>
            <option value="heading-1">Titre 1</option>
            <option value="heading-2">Titre 2</option>
            <option value="heading-3">Titre 3</option>
          </select>
          <div className="w-px h-5 bg-gray-200" />
          <ToolbarBtn icon={Bold} onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} />
          <ToolbarBtn icon={Italic} onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} />
          <ToolbarBtn icon={Underline} onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} />
          <ToolbarBtn icon={Strikethrough} onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive('strike')} />
          <div className="w-px h-5 bg-gray-200" />
          <ToolbarBtn icon={AlignLeft} onClick={() => editor?.chain().focus().setTextAlign('left').run()} active={editor?.isActive({ textAlign: 'left' })} />
          <ToolbarBtn icon={AlignCenter} onClick={() => editor?.chain().focus().setTextAlign('center').run()} active={editor?.isActive({ textAlign: 'center' })} />
          <ToolbarBtn icon={AlignRight} onClick={() => editor?.chain().focus().setTextAlign('right').run()} active={editor?.isActive({ textAlign: 'right' })} />
          <ToolbarBtn icon={AlignJustify} onClick={() => editor?.chain().focus().setTextAlign('justify').run()} active={editor?.isActive({ textAlign: 'justify' })} />
          <div className="w-px h-5 bg-gray-200" />
          <ToolbarBtn icon={List} onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} />
          <ToolbarBtn icon={ListOrdered} onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} />
          <ToolbarBtn icon={Quote} onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')} />
          <ToolbarBtn icon={Code} onClick={() => editor?.chain().focus().toggleCode().run()} active={editor?.isActive('code')} />
          <ToolbarBtn icon={Superscript} onClick={() => editor?.chain().focus().toggleSuperscript().run()} active={editor?.isActive('superscript')} />
          <ToolbarBtn icon={Table} onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
        </div>
      </header>

      {/* 3 Panes */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Informations */}
        <div
          className="border-r border-border-light bg-gray-50 overflow-y-auto transition-all duration-300 shrink-0"
          style={{ width: leftOpen ? 280 : 0, opacity: leftOpen ? 1 : 0 }}
        >
          {leftOpen && (
              <div className="p-4 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-h5 text-text-primary">Informations</h3>
                  <button onClick={() => setLeftOpen(false)} className="p-1 text-text-muted hover:text-text-primary">
                    <PanelLeftClose size={16} />
                  </button>
                </div>

                {/* Identity */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-2">Identité</p>
                  <div className="space-y-2">
                    <FormInput label="Nom" value={state.user?.lastname || ''} readOnly />
                    <FormInput label="Prénom" value={state.user?.firstname || ''} readOnly />
                    <FormInput label="Email" value={state.user?.email || ''} readOnly />
                  </div>
                </div>

                {/* Thesis */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-2">Mémoire</p>
                  <div className="space-y-2">
                    <FormTextarea label="Thème" value={projectInfo.theme} onChange={(v) => setProjectInfo({ ...projectInfo, theme: v })} />
                    <FormTextarea label="Problématique" value={projectInfo.problematique} onChange={(v) => setProjectInfo({ ...projectInfo, problematique: v })} />
                    <FormInput label="Faculté / UFR" value={projectInfo.faculty} onChange={(v) => setProjectInfo({ ...projectInfo, faculty: v })} />
                    <FormSelect label="Année académique" value={projectInfo.academicYear} onChange={(v) => setProjectInfo({ ...projectInfo, academicYear: v })} options={['2024-2025', '2023-2024', '2025-2026']} />
                    <FormSelect label="Niveau" value={projectInfo.level} onChange={(v) => setProjectInfo({ ...projectInfo, level: v })} options={['licence', 'master', 'doctorat', 'stage']} />
                  </div>
                </div>

                {/* Supervision */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-2">Encadrement</p>
                  <div className="space-y-2">
                    <FormInput label="Encadreur" value={projectInfo.supervisor} onChange={(v) => setProjectInfo({ ...projectInfo, supervisor: v })} />
                    <FormInput label="Co-encadreur (optionnel)" value={projectInfo.coSupervisor} onChange={(v) => setProjectInfo({ ...projectInfo, coSupervisor: v })} />
                  </div>
                </div>

                <button onClick={handleSaveProjectInfo} disabled={savingInfo} className="w-full bg-gold hover:bg-gold-light text-brand-900 font-semibold py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50">
                  {savingInfo ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
          )}
        </div>

        {!leftOpen && (
          <button
            onClick={() => setLeftOpen(true)}
            className="absolute left-0 top-[82px] z-20 p-1.5 bg-white border border-border-light rounded-r-lg shadow-sm"
          >
            <ChevronRight size={16} className="text-text-muted" />
          </button>
        )}

        {/* Center Pane: Editor */}
        <div className="flex-1 bg-[#F0F0F0] overflow-auto flex flex-col items-center py-6">
          <div
            className="bg-white shadow-lg min-h-[800px] px-[25mm] py-[20mm]"
            style={{
              width: `${210 * zoom / 100}mm`,
              maxWidth: '95%',
            }}
          >
            <EditorContent
              editor={editor}
              className="prose prose-sm max-w-none font-editor text-[12pt] leading-[1.8] text-gray-900 focus:outline-none editor-content"
            />
          </div>
        </div>

        {/* Right Pane: Structure & AI */}
        <div
          className="border-l border-border-light bg-white overflow-y-auto transition-all duration-300 shrink-0"
          style={{ width: rightOpen ? 300 : 0, opacity: rightOpen ? 1 : 0 }}
        >
          {rightOpen && (
            <div>
              {/* Tabs */}
              <div className="flex border-b border-border-light">
                {[
                  { key: 'structure' as const, icon: GitBranch, label: 'Structure' },
                  { key: 'ai' as const, icon: Sparkles, label: 'IA' },
                  { key: 'comments' as const, icon: MessageSquare, label: 'Commentaires' },
                  { key: 'versions' as const, icon: History, label: 'Versions' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => dispatch({ type: 'SET_RIGHT_PANEL_TAB', tab: tab.key })}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                      rightPanelTab === tab.key
                        ? 'text-brand-600 border-b-2 border-brand-600'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <tab.icon size={14} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="p-3">
                {rightPanelTab === 'structure' && (
                  <StructurePanel
                    sections={project.sections}
                    activeSection={activeSection}
                    onSelect={setActiveSection}
                    sectionColors={sectionColors}
                  />
                )}

                {rightPanelTab === 'ai' && (
                  <AIPanel
                    messages={aiMessages}
                    enabled={aiEnabled}
                    onToggle={() => dispatch({ type: 'TOGGLE_AI' })}
                    input={message}
                    onInput={setMessage}
                    onSend={handleSendMessage}
                    quickActions={quickActions}
                  />
                )}

                {rightPanelTab === 'comments' && (
                  <CommentsPanel
                    comments={state.comments.filter((c) => c.sectionId === activeSection)}
                    activeSection={activeSection}
                    onResolve={(commentId) => {
                      dispatch({ type: 'RESOLVE_COMMENT', commentId })
                      editor?.chain().focus().removeCommentHighlight(commentId).run()
                    }}
                    onReply={async (commentId, content, audioBlob) => {
                      let audioUrl = ''
                      if (audioBlob) {
                        const result = await api.uploadAudio(audioBlob)
                        audioUrl = result.url
                      }
                      dispatch({
                        type: 'ADD_COMMENT_REPLY',
                        commentId,
                        reply: {
                          id: `r${Date.now()}`,
                          userId: state.user?.id || '1',
                          userName: state.user ? `${state.user.firstname} ${state.user.lastname}` : 'Marie K.',
                          avatar: state.user?.avatar || '/images/avatar-user-3.jpg',
                          content,
                          audioUrl: audioUrl || undefined,
                          createdAt: new Date().toISOString(),
                        },
                      })
                    }}
                    onScrollToComment={(commentId) => {
                      if (!editor) return
                      let targetPos: number | null = null
                      editor.state.doc.descendants((node: any, pos: number) => {
                        if (node.marks) {
                          node.marks.forEach((mark: any) => {
                            if (mark.type.name === 'commentHighlight' && mark.attrs.commentId === commentId) {
                              targetPos = pos
                              return false
                            }
                          })
                        }
                        if (targetPos !== null) return false
                      })
                      if (targetPos !== null) {
                        editor.commands.setTextSelection({ from: targetPos, to: targetPos + 1 })
                        editor.commands.scrollIntoView()
                      }
                    }}
                  />
                )}

                {rightPanelTab === 'versions' && (
                  <VersionHistoryPanel
                    versions={state.versions.filter((v) => v.projectId === project.id)}
                    onSave={() => {
                      if (!project) return
                      dispatch({
                        type: 'SAVE_VERSION',
                        version: {
                          id: `v${Date.now()}`,
                          projectId: project.id,
                          label: `Version du ${new Date().toLocaleDateString('fr-FR')}`,
                          createdAt: new Date().toISOString(),
                          sections: project.sections.map((s) => ({ id: s.id, content: s.content })),
                        },
                      })
                    }}
                    onRestore={(versionId) => {
                      dispatch({ type: 'RESTORE_VERSION', projectId: project.id, versionId })
                      if (editor) {
                        const restoredVersion = state.versions.find((v) => v.id === versionId)
                        if (restoredVersion) {
                          const sectionContent = restoredVersion.sections.find((s) => s.id === activeSection)?.content
                          if (sectionContent !== undefined) {
                            editor.commands.setContent(sectionContent)
                          }
                        }
                      }
                    }}
                  />
                )}
              </div>

              <button
                onClick={() => setRightOpen(false)}
                className="absolute top-[90px] right-[300px] p-1 text-text-muted hover:text-text-primary"
                style={{ display: rightOpen ? 'block' : 'none' }}
              >
                <PanelRightClose size={16} />
              </button>
            </div>
          )}
        </div>

        {!rightOpen && (
          <button
            onClick={() => setRightOpen(true)}
            className="absolute right-0 top-[82px] z-20 p-1.5 bg-white border border-border-light rounded-l-lg shadow-sm"
          >
            <ChevronLeft size={16} className="text-text-muted" />
          </button>
        )}
      </div>

      {/* Status Bar */}
      <footer className="shrink-0 h-7 bg-brand-900 flex items-center justify-between px-3 text-[11px] text-brand-400">
        <div className="flex items-center gap-3">
          <span>Page 1 sur 1</span>
          <span>|</span>
          <span>Mots: {editor?.getText().split(/\s+/).filter(Boolean).length || 0}</span>
          {savedIndicator && <span className="text-green-400">&#10003; Sauvegardé</span>}
        </div>
        <span>Auto-sauvegardé il y a 2 min</span>
      </footer>

      {/* Export Modal */}
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
      {showShare && id && project && <ShareDialog projectId={id} open={showShare} onClose={() => setShowShare(false)} />}

      {/* Search Bar */}
      {showSearch && (
        <div className="absolute top-[82px] left-1/2 -translate-x-1/2 bg-white border border-border-light rounded-lg shadow-lg p-2 flex items-center gap-1 z-30 w-96">
          <Search size={14} className="text-text-muted shrink-0" />
          <input
            type="text"
            placeholder="Rechercher dans le document..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') goToMatch(e.shiftKey ? searchIndex - 1 : searchIndex + 1)
              if (e.key === 'Escape') setShowSearch(false)
            }}
            className="flex-1 text-xs focus:outline-none"
            autoFocus
          />
          {searchMatches.length > 0 && (
            <span className="text-[10px] text-text-muted shrink-0 tabular-nums">
              {Math.min(searchIndex + 1, searchMatches.length)}/{searchMatches.length}
            </span>
          )}
          <button
            onClick={() => goToMatch(searchIndex - 1)}
            disabled={searchMatches.length === 0}
            className="p-1 text-text-muted hover:text-text-primary rounded disabled:opacity-30"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={() => goToMatch(searchIndex + 1)}
            disabled={searchMatches.length === 0}
            className="p-1 text-text-muted hover:text-text-primary rounded disabled:opacity-30"
          >
            <ChevronDown size={14} />
          </button>
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchMatches([]) }} className="p-1 text-text-muted hover:text-text-primary rounded">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Floating Comment Button */}
      {selectionRange && !showCommentInput && (
        <div
          className="absolute z-40"
          style={{ left: selectionCoords?.x || 0, top: (selectionCoords?.y || 0) - 40, transform: 'translateX(-50%)' }}
        >
          <button
            onClick={() => setShowCommentInput(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-700 text-white text-xs font-medium rounded-lg shadow-lg hover:bg-brand-800 transition-colors"
          >
            <MessageSquarePlus size={14} /> Commenter
          </button>
        </div>
      )}

      {/* Comment Input Popup */}
      {showCommentInput && (
        <div
          className="absolute z-40 bg-white border border-border-light rounded-xl shadow-xl p-3 w-72"
          style={{ left: selectionCoords?.x || 0, top: (selectionCoords?.y || 0) - 120, transform: 'translateX(-50%)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={14} className="text-brand-600" />
            <span className="text-xs font-semibold text-text-primary">Nouveau commentaire</span>
          </div>
          <div className="text-[10px] text-text-muted mb-2 p-1.5 bg-gray-50 rounded border border-gray-100 italic line-clamp-2">
            "{editor?.state.doc.textBetween(selectionRange.from, selectionRange.to)}"
          </div>
          <textarea
            value={commentInputValue}
            onChange={(e) => setCommentInputValue(e.target.value)}
            placeholder="Écrivez votre commentaire..."
            className="w-full text-xs border border-border-light rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gold/40 resize-none mb-2"
            rows={3}
            autoFocus
          />
          <div className="flex gap-1.5 justify-end">
            <button
              onClick={() => { setShowCommentInput(false); setCommentInputValue('') }}
              className="px-3 py-1 text-xs text-text-muted hover:text-text-primary"
            >
              Annuler
            </button>
            <button
              onClick={handleCreateComment}
              disabled={!commentInputValue.trim()}
              className="px-3 py-1 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              Ajouter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Sub-components ─── */

function ToolbarBtn({ icon: Icon, onClick, active }: { icon: React.ComponentType<{ size?: number; className?: string }>; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${active ? 'bg-brand-100 text-brand-700' : 'text-text-muted hover:text-text-primary hover:bg-gray-50'}`}
    >
      <Icon size={15} />
    </button>
  )
}

function FormInput({ label, value, onChange, readOnly }: { label: string; value: string; onChange?: (v: string) => void; readOnly?: boolean }) {
  return (
    <div>
      <label className="text-[10px] text-text-muted block mb-0.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        className={`w-full text-xs border border-border-light rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gold/40 ${readOnly ? 'bg-gray-50 text-text-muted cursor-default' : ''}`}
      />
    </div>
  )
}

function FormSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="text-[10px] text-text-muted block mb-0.5">{label}</label>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full text-xs border border-border-light rounded px-2 py-1.5 pr-7 appearance-none focus:outline-none focus:ring-1 focus:ring-gold/40 bg-white">
          <option value="">Sélectionnez...</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
      </div>
    </div>
  )
}

function FormTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] text-text-muted block mb-0.5">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full text-xs border border-border-light rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gold/40 resize-none"
      />
    </div>
  )
}

const statusConfig: Record<SectionStatus, { label: string; color: string; bg: string; dot: string }> = {
  valide: { label: 'Validé', color: 'text-green-700', bg: 'bg-green-100', dot: 'bg-green-500' },
  en_cours: { label: 'En cours', color: 'text-amber-700', bg: 'bg-amber-100', dot: 'bg-amber-500' },
  a_corriger: { label: 'À corriger', color: 'text-red-700', bg: 'bg-red-100', dot: 'bg-red-500' },
}

function StructurePanel({ sections, activeSection, onSelect, sectionColors }: {
  sections: Section[]
  activeSection: string
  onSelect: (id: string) => void
  sectionColors: Record<string, string>
}) {
  const { dispatch } = useStore()
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const projectId = sections[0]?.projectId
  const [orderedSections, setOrderedSections] = useState(sections)

  useEffect(() => { setOrderedSections(sections) }, [sections])

  const sectionTypeIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    cover: FileText,
    chapter: BookOpen,
    introduction: FileText,
    conclusion: FileText,
    bibliography: BookOpen,
    default: FileText,
  }

  const cycleStatus = (section: Section) => {
    const order: SectionStatus[] = ['en_cours', 'valide', 'a_corriger']
    const idx = order.indexOf(section.status)
    const next = order[(idx + 1) % order.length]
    dispatch({ type: 'UPDATE_SECTION_STATUS', projectId: section.projectId, sectionId: section.id, status: next })
  }

  const handleAddChapter = async () => {
    if (!projectId) return
    setAdding(true)
    try {
      const section = await api.projects.addSection(projectId, {
        title: newTitle.trim() || 'Nouveau chapitre',
        type: 'chapter',
      })
      dispatch({ type: 'ADD_SECTION', projectId, section })
      onSelect(section.id)
      setNewTitle('')
    } catch {}
    setAdding(false)
  }

  const handleDeleteSection = async (sectionId: string) => {
    if (!projectId) return
    try {
      await api.projects.deleteSection(projectId, sectionId)
      dispatch({ type: 'REMOVE_SECTION', projectId, sectionId })
      if (activeSection === sectionId && sections.length > 1) {
        const remaining = sections.filter((s) => s.id !== sectionId)
        onSelect(remaining[0]?.id || '')
      }
    } catch {}
  }

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = async (dropIdx: number) => {
    if (dragIndex === null || dragIndex === dropIdx || !projectId) {
      setDragIndex(null); setDragOverIndex(null); return
    }
    const reordered = [...orderedSections]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(dropIdx, 0, moved)
    setOrderedSections(reordered)
    setDragIndex(null)
    setDragOverIndex(null)

    const order = reordered.map((s, i) => ({ id: s.id, orderIndex: i }))
    try {
      await api.projects.reorderSections(projectId, order)
      dispatch({ type: 'REORDER_SECTIONS', projectId, sectionIds: reordered.map((s) => s.id) })
    } catch {}
  }

  return (
    <div>
      <h3 className="text-h5 text-text-primary mb-3">Plan du mémoire</h3>
      <div className="space-y-0.5">
        {orderedSections.map((section, index) => {
          const Icon = sectionTypeIcons[section.type] || sectionTypeIcons.default
          const isActive = section.id === activeSection
          const sc = statusConfig[section.status]
          const isDragOver = dragOverIndex === index
          return (
            <div key={section.id}>
              <div
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(index)}
                className={`flex items-center gap-1 rounded-lg transition-all ${
                  isDragOver ? 'pt-4 border-t-2 border-gold' : ''
                } ${dragIndex === index ? 'opacity-40' : ''}`}
              >
                <button
                  onClick={() => onSelect(section.id)}
                  className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors text-left ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-text-secondary hover:bg-gray-50'
                  }`}
                >
                  <GripVertical size={12} className="text-text-muted shrink-0 cursor-grab" />
                  <Icon size={13} className={`shrink-0 ${sectionColors[section.type] || 'text-text-muted'}`} />
                  <span className="truncate">{section.title}</span>
                </button>
                {section.type !== 'cover' && section.type !== 'bibliography' && (
                  <button
                    onClick={() => handleDeleteSection(section.id)}
                    className="shrink-0 p-1 text-text-muted hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Supprimer"
                  >
                    <X size={12} />
                  </button>
                )}
                <button
                  onClick={() => cycleStatus(section)}
                  title={`Statut : ${sc.label}. Cliquez pour changer.`}
                  className={`shrink-0 flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-medium ${sc.bg} ${sc.color} hover:opacity-80 transition-opacity`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                  {sc.label}
                </button>
              </div>
              {section.subsections && (
                <div className="ml-6 border-l border-gray-100 pl-2 space-y-0.5">
                  {section.subsections.map((sub) => (
                    <button
                      key={sub.id}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] text-text-muted hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
                      <span className="truncate">{sub.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-3 space-y-2">
        {adding ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddChapter()}
              placeholder="Titre du chapitre..."
              className="flex-1 text-xs border border-border-light rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gold/40"
              autoFocus
            />
            <button onClick={handleAddChapter} className="p-1.5 bg-gold text-brand-900 rounded-lg hover:bg-gold-light transition-colors">
              <CheckCircle2 size={14} />
            </button>
            <button onClick={() => { setAdding(false); setNewTitle('') }} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-brand-500 text-brand-500 rounded-lg text-xs hover:bg-brand-50 transition-colors"
          >
            <Plus size={14} /> Ajouter un chapitre
          </button>
        )}
      </div>
    </div>
  )
}

function AIPanel({ messages, enabled, onToggle, input, onInput, onSend, quickActions }: {
  messages: { id: string; role: 'user' | 'assistant'; content: string }[]
  enabled: boolean
  onToggle: () => void
  input: string
  onInput: (v: string) => void
  onSend: () => void
  quickActions: string[]
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-[calc(100vh-160px)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-h5 text-text-primary flex items-center gap-1.5">
          <Sparkles size={16} className="text-gold" /> Assistant IA
        </h3>
        <button
          onClick={onToggle}
          className={`w-8 h-4 rounded-full transition-colors relative ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}
        >
          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {!enabled && (
        <div className="flex-1 flex items-center justify-center text-center p-4">
          <p className="text-body-sm text-text-muted">L'assistant IA est désactivé. Activez-le pour obtenir des suggestions.</p>
        </div>
      )}

      {enabled && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs ${
                  msg.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-text-primary rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {quickActions.map((action) => (
              <button
                key={action}
                onClick={() => onInput(action)}
                className="text-[10px] bg-brand-50 text-brand-600 px-2 py-1 rounded-full hover:bg-brand-100 transition-colors"
              >
                {action}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={input}
              onChange={(e) => onInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSend()}
              placeholder="Posez une question..."
              className="flex-1 text-xs border border-border-light rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold/40"
            />
            <button
              onClick={onSend}
              className="p-2 bg-gold hover:bg-gold-light text-brand-900 rounded-lg transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function CommentsPanel({ comments, activeSection, onResolve, onReply, onScrollToComment }: {
  comments: Comment[]
  activeSection: string
  onResolve: (id: string) => void
  onReply: (id: string, content: string, audioBlob?: Blob) => void
  onScrollToComment: (id: string) => void
}) {
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({})
  const [showReplyFor, setShowReplyFor] = useState<string | null>(null)

  const activeComments = comments.filter((c) => !c.resolved)
  const resolvedComments = comments.filter((c) => c.resolved)

  return (
    <div className="flex flex-col h-[calc(100vh-160px)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-h5 text-text-primary flex items-center gap-1.5">
          <MessageSquare size={16} className="text-brand-600" /> Commentaires
          {activeComments.length > 0 && (
            <span className="text-[10px] bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded-full font-medium">{activeComments.length}</span>
          )}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {activeComments.length === 0 && resolvedComments.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare size={24} className="mx-auto text-gray-300 mb-2" />
            <p className="text-body-sm text-text-muted">Sélectionnez du texte dans l'éditeur pour ajouter un commentaire contextuel.</p>
          </div>
        )}

        {/* Active comments */}
        {activeComments.map((comment) => (
          <CommentCard
            key={comment.id}
            comment={comment}
            showReply={showReplyFor === comment.id}
            replyValue={replyInputs[comment.id] || ''}
            onReplyToggle={() => setShowReplyFor(showReplyFor === comment.id ? null : comment.id)}
            onReplyChange={(v) => setReplyInputs({ ...replyInputs, [comment.id]: v })}
            onSendReply={(audioBlob) => {
              const content = replyInputs[comment.id]?.trim() || ''
              if (!content && !audioBlob) return
              onReply(comment.id, content, audioBlob)
              setReplyInputs({ ...replyInputs, [comment.id]: '' })
              setShowReplyFor(null)
            }}
            onResolve={() => onResolve(comment.id)}
            onScroll={() => onScrollToComment(comment.id)}
          />
        ))}

        {/* Resolved section */}
        {resolvedComments.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-3 pb-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                Résolus ({resolvedComments.length})
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            {resolvedComments.map((comment) => (
              <div key={comment.id} className="flex gap-2 p-2 rounded-lg bg-gray-50/50 opacity-60">
                <img src={comment.avatar || '/images/avatar-user-1.jpg'} alt={comment.userName} className="w-5 h-5 rounded-full object-cover shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] font-semibold text-text-primary">{comment.userName}</p>
                    <CheckCircle2 size={10} className="text-green-500" />
                    <span className="text-[9px] text-text-muted">
                      {new Date(comment.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary line-clamp-2">{comment.content}</p>
                  {comment.anchorText && (
                    <p className="text-[9px] text-text-muted italic truncate mt-0.5">"{comment.anchorText}"</p>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="pt-2 border-t border-border-light mt-2 space-y-2">
        <p className="text-[10px] text-text-muted text-center">
          Sélectionnez du texte dans le document pour ajouter un commentaire contextuel
        </p>
        <VoiceNoteComposer sectionId={activeSection} />
      </div>
    </div>
  )
}

function CommentCard({ comment, showReply, replyValue, onReplyToggle, onReplyChange, onSendReply, onResolve, onScroll }: {
  comment: Comment
  showReply: boolean
  replyValue: string
  onReplyToggle: () => void
  onReplyChange: (v: string) => void
  onSendReply: (audioBlob?: Blob) => void
  onResolve: () => void
  onScroll: () => void
}) {
  const [replyAudioBlob, setReplyAudioBlob] = useState<Blob | null>(null)

  const handleReplyWithVoice = async (blob: Blob) => {
    setReplyAudioBlob(blob)
  }

  const handleSendReply = () => {
    onSendReply(replyAudioBlob || undefined)
    setReplyAudioBlob(null)
  }
  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "à l'instant"
    if (mins < 60) return `il y a ${mins} min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `il y a ${hours}h`
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="rounded-lg bg-gray-50 border border-gray-100 overflow-hidden">
      {/* Main comment */}
      <div className="p-2">
        <div className="flex gap-2">
          <img src={comment.avatar || '/images/avatar-user-1.jpg'} alt={comment.userName} className="w-6 h-6 rounded-full object-cover shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-semibold text-text-primary">{comment.userName}</p>
                <span className="text-[9px] text-text-muted">{timeAgo(comment.createdAt)}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={onScroll} className="p-0.5 text-text-muted hover:text-brand-600 rounded" title="Aller au commentaire">
                  <CornerDownRight size={12} />
                </button>
                <button onClick={onResolve} className="p-0.5 text-text-muted hover:text-green-600 rounded" title="Résoudre">
                  <CheckCheck size={12} />
                </button>
              </div>
            </div>
            {comment.audioUrl ? (
              <AudioPlayer src={comment.audioUrl} />
            ) : (
              <p className="text-[11px] text-text-secondary mt-0.5">{comment.content}</p>
            )}
            {comment.anchorText && (
              <button onClick={onScroll} className="text-[9px] text-brand-600 italic truncate block mt-0.5 hover:underline text-left">
                "{comment.anchorText}"
              </button>
            )}
          </div>
        </div>

        {/* Replies */}
        {comment.replies.length > 0 && (
          <div className="ml-8 mt-1.5 space-y-1.5 border-l-2 border-gray-200 pl-2">
            {comment.replies.map((reply) => (
              <div key={reply.id} className="flex gap-1.5">
                <img src={reply.avatar || '/images/avatar-user-1.jpg'} alt={reply.userName} className="w-4 h-4 rounded-full object-cover shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="text-[10px] font-semibold text-text-primary">{reply.userName}</p>
                    <span className="text-[8px] text-text-muted">{timeAgo(reply.createdAt)}</span>
                  </div>
                  {reply.audioUrl ? (
                    <AudioPlayer src={reply.audioUrl} />
                  ) : (
                    <p className="text-[10px] text-text-secondary">{reply.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reply button */}
        <button onClick={onReplyToggle} className="flex items-center gap-1 text-[10px] text-text-muted hover:text-brand-600 mt-1 ml-8">
          <Reply size={10} /> Répondre
        </button>

        {/* Reply input */}
        {showReply && (
          <div className="ml-8 mt-1.5">
            <div className="flex gap-1">
              <input
                type="text"
                value={replyValue}
                onChange={(e) => onReplyChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSendReply()}
                placeholder="Écrire une réponse..."
                className="flex-1 text-[10px] border border-border-light rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gold/40"
                autoFocus
              />
              <VoiceRecorder onSend={handleReplyWithVoice} />
              <button onClick={handleSendReply} disabled={!replyValue.trim() && !replyAudioBlob} className="p-1 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50">
                <Send size={10} />
              </button>
            </div>
            {replyAudioBlob && (
              <div className="mt-1 flex items-center gap-1 text-[9px] text-text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Message vocal ajouté
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ExportModal({ onClose }: { onClose: () => void }) {
  const [format, setFormat] = useState<'pdf' | 'docx' | 'print'>('pdf')
  const [step, setStep] = useState<'options' | 'progress' | 'done'>('options')
  const [progress, setProgress] = useState(0)
  const [stepText, setStepText] = useState('Préparation...')
  const { state } = useStore()

  const handleExport = () => {
    if (format === 'print') {
      window.print()
      onClose()
      return
    }

    setStep('progress')
    const projectId = state.currentProject?.id || state.projects[0]?.id
    if (!projectId) return

    const steps = [
      { pct: 25, text: 'Préparation...' },
      { pct: 50, text: 'Formatage selon template...' },
      { pct: 75, text: 'Génération du document...' },
      { pct: 100, text: 'Terminé !' },
    ]
    steps.forEach((s, i) => {
      setTimeout(() => {
        setProgress(s.pct)
        setStepText(s.text)
        if (s.pct === 100) {
          setTimeout(() => {
            setStep('done')
            if (format === 'pdf') {
              window.open(`/api/export/${projectId}`, '_blank')
            } else if (format === 'docx') {
              window.open(`/api/export/${projectId}/docx`, '_blank')
            }
          }, 500)
        }
      }, (i + 1) * 400)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(10, 22, 40, 0.85)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-[540px] mx-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-h3 text-text-primary">Exporter le document</h3>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary"><X size={20} /></button>
        </div>

        {step === 'options' && (
          <>
            {/* Format */}
            <div className="mb-5">
              <label className="text-h5 text-text-primary mb-2 block">Format</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'pdf' as const, icon: FileText, label: 'PDF' },
                  { key: 'docx' as const, icon: FileText, label: 'Word .docx' },
                  { key: 'print' as const, icon: Printer, label: 'Imprimer' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFormat(f.key)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                      format === f.key ? 'border-gold bg-gold/5' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <f.icon size={24} className={format === f.key ? 'text-gold' : 'text-text-muted'} />
                    <span className={`text-xs font-medium ${format === f.key ? 'text-brand-900' : 'text-text-muted'}`}>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="mb-5 space-y-2">
              {['Inclure page de garde', 'Inclure table des matières', 'Numérotation des pages', 'Bibliographie formatée'].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-gold focus:ring-gold" />
                  <span className="text-sm text-text-secondary">{opt}</span>
                </label>
              ))}
            </div>

            {/* Quality */}
            <div className="mb-6">
              <label className="text-h5 text-text-primary mb-2 block">Qualité PDF</label>
              <select className="w-full text-sm border border-border-light rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold/40">
                <option>Standard</option>
                <option>Haute</option>
                <option>Impression</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 border border-border-light text-text-secondary rounded-[10px] text-sm font-medium hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleExport} className="flex-1 py-2.5 bg-gold hover:bg-gold-light text-brand-900 rounded-[10px] text-sm font-semibold transition-colors">
                Exporter
              </button>
            </div>
          </>
        )}

        {step === 'progress' && (
          <div className="py-8 text-center">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-gold transition-all duration-500 rounded-full" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-body-sm text-text-secondary">{stepText}</p>
          </div>
        )}

        {step === 'done' && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <p className="text-h4 text-text-primary mb-2">Export terminé !</p>
            <p className="text-body-sm text-text-secondary mb-6">Votre document a été généré avec succès.</p>
              <button
                onClick={() => {
                  const projectId = state.currentProject?.id || state.projects[0]?.id
                  if (projectId) window.open(format === 'docx' ? `/api/export/${projectId}/docx` : `/api/export/${projectId}`, '_blank')
                }}
                className="py-2.5 px-6 bg-gold hover:bg-gold-light text-brand-900 rounded-[10px] text-sm font-semibold transition-colors"
              >
                Télécharger le fichier
              </button>
          </div>
        )}
      </div>
    </div>
  )
}

function VoiceNoteComposer({ sectionId }: { sectionId: string }) {
  const { dispatch } = useStore()
  const handleVoiceSend = async (blob: Blob) => {
    try {
      const { url } = await api.uploadAudio(blob)
      const commentData = { sectionId, content: '[Message vocal]', audioUrl: url }
      const saved = await api.comments.create(commentData)
      dispatch({ type: 'ADD_COMMENT', comment: saved })
    } catch {}
  }
  return (
    <div className="flex items-center justify-center gap-2 p-2 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
      <span className="text-[9px] text-text-muted">Ajouter un commentaire vocal</span>
      <VoiceRecorder onSend={handleVoiceSend} />
    </div>
  )
}

function VersionHistoryPanel({ versions, onSave, onRestore }: {
  versions: DocumentVersion[]
  onSave: () => void
  onRestore: (versionId: string) => void
}) {
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const { state } = useStore()
  const project = state.currentProject

  const handleRestore = (versionId: string) => {
    setRestoringId(versionId)
    setTimeout(() => {
      onRestore(versionId)
      setRestoringId(null)
    }, 500)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-160px)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-h5 text-text-primary flex items-center gap-1.5">
          <History size={16} className="text-brand-600" /> Historique
        </h3>
      </div>

      {/* Save current version */}
      <button
        onClick={onSave}
        className="w-full flex items-center justify-center gap-1.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg transition-colors mb-4"
      >
        <Plus size={14} /> Sauvegarder la version actuelle
      </button>

      {/* Version list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {versions.length === 0 ? (
          <div className="text-center py-8">
            <History size={24} className="mx-auto text-gray-300 mb-2" />
            <p className="text-body-sm text-text-muted">Aucune version sauvegardée pour le moment.</p>
          </div>
        ) : (
          versions.map((version, idx) => {
            const isLatest = idx === 0
            const isRestoring = restoringId === version.id
            return (
              <div
                key={version.id}
                className={`rounded-lg border p-3 transition-all ${
                  isLatest ? 'border-brand-200 bg-brand-50/50' : 'border-gray-100 bg-white hover:border-gray-200'
                } ${isRestoring ? 'opacity-50 scale-95' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Circle size={8} className={isLatest ? 'text-brand-600 fill-brand-600' : 'text-gray-400'} />
                      <p className="text-[11px] font-semibold text-text-primary truncate">{version.label}</p>
                      {isLatest && (
                        <span className="text-[8px] bg-brand-100 text-brand-600 px-1 py-0.5 rounded font-medium">Actuelle</span>
                      )}
                    </div>
                    {version.description && (
                      <p className="text-[10px] text-text-secondary mt-0.5">{version.description}</p>
                    )}
                    <p className="text-[9px] text-text-muted mt-0.5">
                      {new Date(version.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-[9px] text-text-muted mt-0.5">
                      {version.sections.length} section{version.sections.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestore(version.id)}
                    disabled={isLatest || isRestoring}
                    className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${
                      isLatest
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    }`}
                    title="Restaurer cette version"
                  >
                    <RotateCcw size={11} />
                    {isRestoring ? 'Restauration...' : 'Restaurer'}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="pt-2 border-t border-border-light mt-2">
        <p className="text-[10px] text-text-muted text-center">
          {project?.sections.reduce((acc, s) => acc + s.content.length, 0) || 0} caractères sauvegardés
        </p>
      </div>
    </div>
  )
}


