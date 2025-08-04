"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send, Clock, CalendarIcon, Users, Image, Bold, Italic, Underline, X, Check, Plus, ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface MessageComposerProps {
  onSendNow: (data: {
    content: string
    groupName: string
    images: File[]
  }) => void
  onSchedule: (data: {
    content: string
    groupName: string
    scheduledFor: Date
    recurrence?: {
      type: 'weekly'
      occurrences?: number
      isInfinite?: boolean
      weekdays?: number[]
    }
    images: File[]
  }) => void
  onUpdate?: (data: {
    id: string
    content: string
    groupName: string
    scheduledTime: string
    occurrences: number
    recurrenceType: 'once' | 'weekly'
    weekdays?: number[]
    images: File[]
  }) => void
  groups: Array<{
    id: string
    name: string
    memberCount: number
  }>
  isConnected: boolean
  editingMessage?: {
    id: string
    content: string
    groupId?: string
    groupName: string
    scheduledFor?: Date
    scheduledTime?: Date
    recurrence?: {
      type: 'once' | 'weekly'
      occurrences?: number
      isInfinite?: boolean
      weekdays?: number[]
    }
    occurrences?: number
    recurrenceType?: 'once' | 'weekly'
    weekdays?: number[]
  }
  onCancelEdit?: () => void
}

const weekdays = [
  { name: 'Sunday', short: 'Sun', value: 0 },
  { name: 'Monday', short: 'Mon', value: 1 },
  { name: 'Tuesday', short: 'Tue', value: 2 },
  { name: 'Wednesday', short: 'Wed', value: 3 },
  { name: 'Thursday', short: 'Thu', value: 4 },
  { name: 'Friday', short: 'Fri', value: 5 },
  { name: 'Saturday', short: 'Sat', value: 6 }
]

export function MessageComposer({ onSendNow, onSchedule, onUpdate, groups, isConnected, editingMessage, onCancelEdit }: MessageComposerProps) {
  const [activeTab, setActiveTab] = useState<"send-now" | "schedule">("send-now")
  const [message, setMessage] = useState("")
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [occurrences, setOccurrences] = useState(1)
  const [isInfinite, setIsInfinite] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<'once' | 'weekly'>('once')
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [groupSearchQuery, setGroupSearchQuery] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Populate form when editing a message
  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.content)
      setSelectedGroups([editingMessage.groupName])
      if (editingMessage.scheduledTime) {
        const scheduledDate = new Date(editingMessage.scheduledTime)
        setScheduleDate(scheduledDate.toISOString().split('T')[0])
        setScheduleTime(scheduledDate.toTimeString().slice(0, 5))
        setActiveTab("schedule")
      }
      setOccurrences(editingMessage.occurrences || 1)
      setIsInfinite(editingMessage.occurrences === -1)
      setRecurrenceType(editingMessage.recurrenceType || 'once')
      setSelectedWeekdays(editingMessage.weekdays || [])
    }
  }, [editingMessage])

  const validateMessage = () => {
    const newErrors: Record<string, string> = {}

    if (!message.trim()) {
      newErrors.message = "Message cannot be empty"
    }

    if (selectedGroups.length === 0) {
      newErrors.groups = "Please select at least one group"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateSchedule = () => {
    const newErrors: Record<string, string> = {}

    if (!message.trim()) {
      newErrors.message = "Message cannot be empty"
    }

    if (selectedGroups.length === 0) {
      newErrors.groups = "Please select at least one group"
    }

    if (!scheduleDate) {
      newErrors.date = "Please select a date"
    }

    if (!scheduleTime) {
      newErrors.time = "Please select a time"
    }

    if (recurrenceType === 'weekly' && selectedWeekdays.length === 0) {
      newErrors.weekdays = "Please select at least one weekday"
    }

    if (!isInfinite && occurrences < 1) {
      newErrors.occurrences = "Occurrences must be at least 1"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSendNow = () => {
    if (!validateMessage()) return

    selectedGroups.forEach(groupId => {
      const selectedGroupData = groups.find((g) => g.id === groupId)
      onSendNow({
        content: message,
        groupName: selectedGroupData?.name || groupId,
        images: uploadedImages
      })
    })

    clearForm()
  }

  const handleSchedule = () => {
    if (!validateSchedule()) return

    const scheduledDateTime = new Date(scheduleDate)
    const [hours, minutes] = scheduleTime.split(':')
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes))

    selectedGroups.forEach(groupId => {
      const selectedGroupData = groups.find((g) => g.id === groupId)

      const scheduleData = {
        message,
        group: selectedGroupData?.name || groupId,
        scheduledTime: scheduledDateTime,
        occurrences: isInfinite ? -1 : occurrences,
        recurrenceType,
        weekdays: recurrenceType === 'weekly' ? selectedWeekdays : undefined,
        images: uploadedImages
      }

      if (editingMessage && onUpdate) {
        onUpdate({
          id: editingMessage.id,
          content: scheduleData.message,
          groupName: scheduleData.group,
          scheduledTime: scheduleData.scheduledTime.toISOString(),
          occurrences: scheduleData.occurrences,
          recurrenceType: scheduleData.recurrenceType,
          weekdays: scheduleData.weekdays,
          images: uploadedImages
        })
      } else {
        onSchedule({
          content: scheduleData.message,
          groupName: scheduleData.group,
          scheduledFor: scheduleData.scheduledTime,
          recurrence: scheduleData.recurrenceType === 'once' ? undefined : {
            type: scheduleData.recurrenceType,
            occurrences: scheduleData.occurrences === -1 ? undefined : scheduleData.occurrences,
            isInfinite: scheduleData.occurrences === -1,
            weekdays: scheduleData.weekdays
          },
          images: uploadedImages
        })
      }
    })

    clearForm()
  }

  const clearForm = () => {
    setMessage("")
    setSelectedGroups([])
    setScheduleDate("")
    setScheduleTime("")
    setOccurrences(1)
    setIsInfinite(false)
    setRecurrenceType('once')
    setSelectedWeekdays([])
    setErrors({})
    setUploadedImages([])
    setImagePreviews([])
    setActiveTab("send-now")
    if (onCancelEdit) {
      onCancelEdit()
    }
  }

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups((prev: string[]) =>
      prev.includes(groupId)
        ? prev.filter((id: string) => id !== groupId)
        : [...prev, groupId]
    )
  }

  const selectAllGroups = () => {
    setSelectedGroups(groups.map(g => g.id))
  }

  const clearAllGroups = () => {
    setSelectedGroups([])
  }

  // Filter groups based on search query
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(groupSearchQuery.toLowerCase())
  )

  const formatText = (formatType: 'bold' | 'italic' | 'underline') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = message.substring(start, end)

    let formattedText = ''
    switch (formatType) {
      case 'bold':
        formattedText = `*${selectedText}*`
        break
      case 'italic':
        formattedText = `_${selectedText}_`
        break
      case 'underline':
        formattedText = `~${selectedText}~`
        break
    }

    const newMessage = message.substring(0, start) + formattedText + message.substring(end)
    setMessage(newMessage)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + 1, start + 1 + selectedText.length)
    }, 0)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, images: 'Please select only image files' }))
        return false
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, images: 'Image size must be less than 10MB' }))
        return false
      }
      return true
    })

    if (validFiles.length > 0) {
      setUploadedImages(prev => [...prev, ...validFiles])

      validFiles.forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
          setImagePreviews(prev => [...prev, e.target?.result as string])
        }
        reader.readAsDataURL(file)
      })

      setErrors(prev => ({ ...prev, images: '' }))
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <Card className="bg-neutral-900 border-neutral-800 text-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <Send className="h-5 w-5 text-[#05c997]" />
          Message Composer
          {!isConnected && (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full ml-auto">
              Disconnected
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "send-now" | "schedule")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-neutral-800 border-neutral-700">
            <TabsTrigger value="send-now" className="data-[state=active]:bg-[#05c997] data-[state=active]:text-white">
              <Send className="h-4 w-4 mr-2" />
              Send Now
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-[#05c997] data-[state=active]:text-white">
              <Clock className="h-4 w-4 mr-2" />
              Schedule
            </TabsTrigger>
          </TabsList>

          <TabsContent value="send-now" className="space-y-4 mt-4">
            {/* Group Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-300">
                  Select Groups
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={selectAllGroups}
                    className="h-7 px-2 text-xs border-neutral-700 hover:bg-neutral-800 text-gray-300 hover:text-white"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    All
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={clearAllGroups}
                    className="h-7 px-2 text-xs border-neutral-700 hover:bg-neutral-800 text-gray-300 hover:text-white"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>

              {/* Dropdown for group selection */}
              <Select onValueChange={(value) => toggleGroupSelection(value)}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                  <SelectValue placeholder="Choose groups to send to..." />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  {/* Search input */}
                  <div className="p-2 border-b border-neutral-700">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search groups..."
                        value={groupSearchQuery}
                        onChange={(e) => setGroupSearchQuery(e.target.value)}
                        className="pl-8 bg-neutral-700 border-neutral-600 text-white placeholder-gray-400 focus:border-[#05c997] h-8"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  {/* Groups list */}
                  <div className="max-h-48 overflow-y-auto">
                    {filteredGroups.length > 0 ? (
                      filteredGroups.map((group) => (
                        <SelectItem
                          key={group.id}
                          value={group.id}
                          className="text-white hover:bg-neutral-700 focus:bg-neutral-700"
                        >
                          <div className="flex items-center gap-2 w-full">
                            <Users className="h-4 w-4 text-gray-400" />
                            <div className="flex-1">
                              <span className="font-medium">{group.name}</span>
                              <span className="text-xs text-gray-400 ml-2">({group.memberCount} members)</span>
                            </div>
                            {selectedGroups.includes(group.id) && (
                              <Check className="h-4 w-4 text-[#05c997]" />
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-3 text-center text-gray-400 text-sm">
                        {groupSearchQuery ? 'No groups found matching your search' : 'No groups available'}
                      </div>
                    )}
                  </div>
                </SelectContent>
              </Select>

              {/* Selected groups as tags */}
              {selectedGroups.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">
                    Selected Groups ({selectedGroups.length})
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedGroups.map((groupId) => {
                      const group = groups.find(g => g.id === groupId)
                      if (!group) return null
                      return (
                        <Badge
                          key={groupId}
                          variant="secondary"
                          className="bg-[#05c997]/10 text-[#05c997] border border-[#05c997]/20 hover:bg-[#05c997]/20 transition-colors"
                        >
                          <Users className="h-3 w-3 mr-1" />
                          {group.name}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleGroupSelection(groupId)}
                            className="h-4 w-4 p-0 ml-1 hover:bg-red-500/20 text-gray-400 hover:text-red-400 bg-transparent"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}

              {errors.groups && <p className="text-sm text-red-400">{errors.groups}</p>}
            </div>

            {/* Message Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="message" className="text-sm font-medium text-gray-300">
                  Message
                </Label>
                <span className="text-xs text-gray-400">
                  {message.length}/4096
                </span>
              </div>

              <div className="relative">
                <Textarea
                  id="message"
                  ref={textareaRef}
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={cn(
                    "bg-neutral-800 border-neutral-700 text-white resize-none min-h-[120px] pr-12",
                    errors.message && "border-red-500"
                  )}
                  maxLength={4096}
                />

                {/* Text Formatting Toolbar */}
                <div className="absolute bottom-2 right-2 flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-neutral-700 text-gray-300 hover:text-white"
                    onClick={() => formatText('bold')}
                    title="Bold"
                  >
                    <Bold className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-neutral-700 text-gray-300 hover:text-white"
                    onClick={() => formatText('italic')}
                    title="Italic"
                  >
                    <Italic className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-neutral-700 text-gray-300 hover:text-white"
                    onClick={() => formatText('underline')}
                    title="Underline"
                  >
                    <Underline className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {errors.message && <p className="text-sm text-red-400">{errors.message}</p>}
            </div>

            {/* Image Upload */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-300">
                  Images
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-neutral-700 hover:bg-neutral-800 text-white h-7 px-2 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Image
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />

              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-16 object-cover rounded border border-neutral-700"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {uploadedImages.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-neutral-800 text-gray-300">
                    {uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </div>

            <Separator className="bg-neutral-700" />

            <Button
              onClick={handleSendNow}
              disabled={!isConnected || !message.trim() || selectedGroups.length === 0}
              className="w-full bg-[#05c997] hover:bg-[#04b085] text-white transition-all duration-200 h-10"
            >
              <Send className="h-4 w-4 mr-2" />
              Send to {selectedGroups.length} group{selectedGroups.length !== 1 ? 's' : ''}
            </Button>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4 mt-4">
            {/* Group Selection for Schedule */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-300">
                  Select Groups
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={selectAllGroups}
                    className="h-7 px-2 text-xs border-neutral-700 hover:bg-neutral-800 text-gray-300 hover:text-white"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    All
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={clearAllGroups}
                    className="h-7 px-2 text-xs border-neutral-700 hover:bg-neutral-800 text-gray-300 hover:text-white"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>

              {/* Dropdown for group selection */}
              <Select onValueChange={(value) => toggleGroupSelection(value)}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                  <SelectValue placeholder="Choose groups to send to..." />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  {/* Search input */}
                  <div className="p-2 border-b border-neutral-700">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search groups..."
                        value={groupSearchQuery}
                        onChange={(e) => setGroupSearchQuery(e.target.value)}
                        className="pl-8 bg-neutral-700 border-neutral-600 text-white placeholder-gray-400 focus:border-[#05c997] h-8"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  {/* Groups list */}
                  <div className="max-h-48 overflow-y-auto">
                    {filteredGroups.length > 0 ? (
                      filteredGroups.map((group) => (
                        <SelectItem
                          key={group.id}
                          value={group.id}
                          className="text-white hover:bg-neutral-700 focus:bg-neutral-700"
                        >
                          <div className="flex items-center gap-2 w-full">
                            <Users className="h-4 w-4 text-gray-400" />
                            <div className="flex-1">
                              <span className="font-medium">{group.name}</span>
                              <span className="text-xs text-gray-400 ml-2">({group.memberCount} members)</span>
                            </div>
                            {selectedGroups.includes(group.id) && (
                              <Check className="h-4 w-4 text-[#05c997]" />
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-3 text-center text-gray-400 text-sm">
                        {groupSearchQuery ? 'No groups found matching your search' : 'No groups available'}
                      </div>
                    )}
                  </div>
                </SelectContent>
              </Select>

              {/* Selected groups as tags */}
              {selectedGroups.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">
                    Selected Groups ({selectedGroups.length})
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedGroups.map((groupId) => {
                      const group = groups.find(g => g.id === groupId)
                      if (!group) return null
                      return (
                        <Badge
                          key={groupId}
                          variant="secondary"
                          className="bg-[#05c997]/10 text-[#05c997] border border-[#05c997]/20 hover:bg-[#05c997]/20 transition-colors"
                        >
                          <Users className="h-3 w-3 mr-1" />
                          {group.name}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleGroupSelection(groupId)}
                            className="h-4 w-4 p-0 ml-1 hover:bg-red-500/20 text-gray-400 hover:text-red-400 bg-transparent"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}

              {errors.groups && <p className="text-sm text-red-400">{errors.groups}</p>}
            </div>

            {/* Message Input for Schedule */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="schedule-message" className="text-sm font-medium text-gray-300">
                  Message
                </Label>
                <span className="text-xs text-gray-400">
                  {message.length}/4096
                </span>
              </div>

              <Textarea
                id="schedule-message"
                placeholder="Type your scheduled message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={cn(
                  "bg-neutral-800 border-neutral-700 text-white resize-none min-h-[100px]",
                  errors.message && "border-red-500"
                )}
                maxLength={4096}
              />
              {errors.message && <p className="text-sm text-red-400">{errors.message}</p>}
            </div>

            {/* Schedule Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-date" className="text-sm font-medium text-gray-300">
                  Date
                </Label>
                <Input
                  id="schedule-date"
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={cn(
                    "bg-neutral-800 border-neutral-700 text-white",
                    errors.date && "border-red-500"
                  )}
                />
                {errors.date && <p className="text-sm text-red-400">{errors.date}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-time" className="text-sm font-medium text-gray-300">
                  Time
                </Label>
                <Input
                  id="schedule-time"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className={cn(
                    "bg-neutral-800 border-neutral-700 text-white",
                    errors.time && "border-red-500"
                  )}
                />
                {errors.time && <p className="text-sm text-red-400">{errors.time}</p>}
              </div>
            </div>

            {/* Recurrence Settings */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-300">
                Recurrence
              </Label>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={recurrenceType === 'once' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRecurrenceType('once')}
                  className={cn(
                    recurrenceType === 'once'
                      ? "bg-[#05c997] hover:bg-[#04b085] text-white"
                      : "border-neutral-700 hover:bg-neutral-800 text-gray-300 hover:text-white"
                  )}
                >
                  Send Once
                </Button>
                <Button
                  type="button"
                  variant={recurrenceType === 'weekly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRecurrenceType('weekly')}
                  className={cn(
                    recurrenceType === 'weekly'
                      ? "bg-[#05c997] hover:bg-[#04b085] text-white"
                      : "border-neutral-700 hover:bg-neutral-800 text-gray-300 hover:text-white"
                  )}
                >
                  Weekly
                </Button>
              </div>

              {recurrenceType === 'weekly' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-300">Select Days</Label>
                    <div className="grid grid-cols-7 gap-1">
                      {weekdays.map((day) => (
                        <Button
                          key={day.value}
                          type="button"
                          size="sm"
                          variant={selectedWeekdays.includes(day.value) ? 'default' : 'outline'}
                          className={cn(
                            "h-8 text-xs",
                            selectedWeekdays.includes(day.value)
                              ? "bg-[#05c997] hover:bg-[#04b085] text-white"
                              : "border-neutral-600 text-gray-300 hover:bg-neutral-700 hover:text-white"
                          )}
                          onClick={() => {
                            if (selectedWeekdays.includes(day.value)) {
                              setSelectedWeekdays(prev => prev.filter(d => d !== day.value))
                            } else {
                              setSelectedWeekdays(prev => [...prev, day.value])
                            }
                          }}
                        >
                          {day.short}
                        </Button>
                      ))}
                    </div>
                    {errors.weekdays && <p className="text-sm text-red-400">{errors.weekdays}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-300">Occurrences</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={isInfinite ? '' : occurrences}
                          onChange={(e) => setOccurrences(parseInt(e.target.value) || 1)}
                          disabled={isInfinite}
                          className="bg-neutral-800 border-neutral-700 text-white"
                        />
                        <Button
                          type="button"
                          variant={isInfinite ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setIsInfinite(!isInfinite)}
                          className={cn(
                            isInfinite
                              ? "bg-[#05c997] hover:bg-[#04b085] text-white"
                              : "border-neutral-700 hover:bg-neutral-800 text-gray-300 hover:text-white"
                          )}
                        >
                          ∞
                        </Button>
                      </div>
                      {errors.occurrences && <p className="text-sm text-red-400">{errors.occurrences}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator className="bg-neutral-700" />

            <Button
              onClick={handleSchedule}
              disabled={!isConnected || !message.trim() || selectedGroups.length === 0 || !scheduleDate || !scheduleTime}
              className="w-full bg-[#05c997] hover:bg-[#04b085] text-white transition-all duration-200 h-10"
            >
              <Clock className="h-4 w-4 mr-2" />
              Schedule for {selectedGroups.length} group{selectedGroups.length !== 1 ? 's' : ''}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
