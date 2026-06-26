import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, Trash2, Send, Play, Pause, Loader2 } from 'lucide-react'

interface VoiceRecorderProps {
  onSend: (blob: Blob) => void
}

export function VoiceRecorder({ onSend }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [uploading, setUploading] = useState(false)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current)
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg' })
      mediaRecorder.current = recorder
      chunks.current = []
      setDuration(0)
      setRecordedBlob(null)

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: recorder.mimeType })
        setRecordedBlob(blob)
        stream.getTracks().forEach((t) => t.stop())
      }

      recorder.start()
      setRecording(true)
      timer.current = setInterval(() => setDuration((d) => d + 1), 1000)
    } catch { setRecording(false) }
  }, [])

  const stopRecording = useCallback(() => {
    mediaRecorder.current?.stop()
    setRecording(false)
    if (timer.current) { clearInterval(timer.current); timer.current = null }
  }, [])

  const cancelRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stream.getTracks().forEach((t) => t.stop())
      mediaRecorder.current.stop()
    }
    setRecording(false)
    setRecordedBlob(null)
    setDuration(0)
    if (timer.current) { clearInterval(timer.current); timer.current = null }
  }, [])

  const handleSend = useCallback(async () => {
    if (!recordedBlob) return
    setUploading(true)
    try {
      onSend(recordedBlob)
      setRecordedBlob(null)
      setDuration(0)
    } finally {
      setUploading(false)
    }
  }, [recordedBlob, onSend])

  const togglePlay = useCallback(() => {
    if (!recordedBlob) return
    if (playing && audioRef.current) {
      audioRef.current.pause()
      setPlaying(false)
      return
    }
    const url = URL.createObjectURL(recordedBlob)
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onended = () => { setPlaying(false); URL.revokeObjectURL(url) }
    audio.play()
    setPlaying(true)
  }, [recordedBlob, playing])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  if (!recording && !recordedBlob) {
    return (
      <button
        type="button"
        onClick={startRecording}
        className="p-1.5 text-text-muted hover:text-red-500 rounded transition-colors"
        title="Enregistrer un message vocal"
      >
        <Mic size={14} />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg border border-gray-100">
      {recording && (
        <>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-medium text-red-500">{formatTime(duration)}</span>
          <button
            type="button"
            onClick={stopRecording}
            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
            title="Arrêter"
          >
            <MicOff size={14} />
          </button>
        </>
      )}
      {recordedBlob && !recording && (
        <>
          <button
            type="button"
            onClick={togglePlay}
            className="p-1 text-text-primary hover:bg-gray-200 rounded transition-colors"
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <span className="text-xs text-text-muted">{formatTime(duration)}</span>
          <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden mx-1">
            <div className={`h-full bg-gold rounded-full ${playing ? 'animate-progress' : ''}`} style={{ width: '0%' }} />
          </div>
          <button
            type="button"
            onClick={cancelRecording}
            className="p-1 text-text-muted hover:text-red-500 rounded transition-colors"
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={uploading}
            className="p-1 text-brand-600 hover:bg-brand-50 rounded transition-colors disabled:opacity-50"
            title="Envoyer"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </>
      )}
    </div>
  )
}

export function AudioPlayer({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio(src)
    audioRef.current = audio
    audio.onloadedmetadata = () => setDuration(audio.duration)
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime)
    audio.onended = () => setPlaying(false)
    return () => { audio.pause(); audio.src = '' }
  }, [src])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play(); setPlaying(true) }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <button
        type="button"
        onClick={togglePlay}
        className="w-6 h-6 flex items-center justify-center bg-gold/20 text-gold rounded-full hover:bg-gold/30 transition-colors"
      >
        {playing ? <Pause size={10} /> : <Play size={10} />}
      </button>
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gold rounded-full transition-all duration-200"
          style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
        />
      </div>
      <span className="text-[9px] text-text-muted w-8 text-right tabular-nums">
        {duration ? formatTime(Math.min(currentTime, duration)) : formatTime(0)}
      </span>
    </div>
  )
}
