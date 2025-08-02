"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Send, Clock, CalendarIcon, Users, Infinity, Image, Bold, Italic, Underline, Strikethrough, X, Star } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface MessageComposerProps {
  onSendNow: (data: {
    content: string
    groupName: string
    recurrenceType: 'once' | 'weekly'
    weekdays?: number[]
    images?: File[]
  }) => void
  onSchedule: (data: {
    content: string
    groupName: string
    scheduledTime: string
    occurrences: number
    recurrenceType: 'once' | 'weekly'
    weekdays?: number[]
    images?: File[]
  }) => void
  groups: Array<{ id: string; name: string; memberCount: number }>
  isConnected: boolean
}

// Add this interface near the top after the existing interfaces
interface Group {
  id: string
  name: string
  memberCount: number
  description?: string
}

// Add this mock data after the imports (you can replace with real data from your API)
const mockGroups: Group[] = [
  {
    id: "1",
    name: "Marketing Team",
    memberCount: 12,
    description: "Marketing department members",
  },
  {
    id: "2",
    name: "Sales Team",
    memberCount: 8,
    description: "Sales representatives",
  },
  {
    id: "3",
    name: "Customer Support",
    memberCount: 15,
    description: "Support team members",
  },
  {
    id: "4",
    name: "Development Team",
    memberCount: 20,
    description: "Software developers and engineers",
  },
  {
    id: "5",
    name: "VIP Customers",
    memberCount: 45,
    description: "Premium tier customers",
  },
]

// Update the state variables - replace recipient with selectedGroup
export function MessageComposer({ onSendNow, onSchedule, groups, isConnected }: MessageComposerProps) {
  const [message, setMessage] = useState("")
  const [selectedGroup, setSelectedGroup] = useState("")
  const [date, setDate] = useState<Date>()
  const [time, setTime] = useState("")
  const [occurrences, setOccurrences] = useState(1)
  const [isInfinite, setIsInfinite] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<'once' | 'weekly'>('once')
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([])
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [favoriteGroups, setFavoriteGroups] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load favorites from localStorage on component mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('whatsapp-bot-favorites')
    if (savedFavorites) {
      setFavoriteGroups(JSON.parse(savedFavorites))
    }
  }, [])

  // Save favorites to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('whatsapp-bot-favorites', JSON.stringify(favoriteGroups))
  }, [favoriteGroups])

  // Toggle favorite status of a group
  const toggleFavorite = (groupId: string) => {
    setFavoriteGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  // Update the validation functions to use selectedGroup instead of recipient
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!message.trim()) {
      newErrors.message = "Message is required"
    } else if (message.length > 1000) {
      newErrors.message = "Message must be less than 1000 characters"
    }

    if (!selectedGroup) {
      newErrors.group = "Please select a group"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateScheduleForm = () => {
    const newErrors: Record<string, string> = {}

    if (!validateForm()) return false

    if (!date) {
      newErrors.date = "Date is required"
    }

    if (!time) {
      newErrors.time = "Time is required"
    }

    if (date && time) {
      const scheduledDateTime = new Date(date)
      const [hours, minutes] = time.split(":")
      scheduledDateTime.setHours(Number.parseInt(hours), Number.parseInt(minutes))

      if (scheduledDateTime <= new Date()) {
        newErrors.datetime = "Scheduled time must be in the future"
      }
    }

    if (!isInfinite && (occurrences < 1 || occurrences > 100)) {
      newErrors.occurrences = "Occurrences must be between 1 and 100"
    }

    if (recurrenceType === 'weekly' && selectedWeekdays.length === 0) {
      newErrors.weekdays = "Please select at least one weekday"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Update the handleSendNow function to use selectedGroup
  const handleSendNow = () => {
    if (!validateForm()) return

    const selectedGroupData = groups.find((g) => g.id === selectedGroup)

    onSendNow({
      content: message,
      groupName: selectedGroupData?.name || selectedGroup,
      recurrenceType,
      weekdays: recurrenceType === 'weekly' ? selectedWeekdays : undefined,
      images: uploadedImages
    })

    // Reset form
    clearForm()
  }

  const clearForm = () => {
    setMessage("")
    setSelectedGroup("")
    setDate(undefined)
    setTime("")
    setOccurrences(1)
    setIsInfinite(false)
    setRecurrenceType('once')
    setSelectedWeekdays([])
    setErrors({})
    setUploadedImages([])
    setImagePreviews([])
  }

  // Text formatting functions
  const formatText = (formatType: 'bold' | 'italic' | 'underline' | 'strikethrough') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = message.substring(start, end)

    let formattedText = selectedText
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
      case 'strikethrough':
        formattedText = `~${selectedText}~`
        break
    }

    const newMessage = message.substring(0, start) + formattedText + message.substring(end)
    setMessage(newMessage)

    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length)
    }, 0)
  }

  // Image handling functions
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/')
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB limit
      return isValidType && isValidSize
    })

    if (validFiles.length !== files.length) {
      setErrors({ ...errors, images: 'Some files were skipped. Only images under 10MB are allowed.' })
    } else {
      setErrors({ ...errors, images: '' })
    }

    const newImages = [...uploadedImages, ...validFiles].slice(0, 5) // Max 5 images
    setUploadedImages(newImages)

    // Create previews
    const newPreviews = [...imagePreviews]
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          newPreviews.push(e.target.result as string)
          setImagePreviews([...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    setUploadedImages(newImages)
    setImagePreviews(newPreviews)
  }

  // Update the handleSchedule function to use selectedGroup
  const handleSchedule = () => {
    if (!validateScheduleForm()) return

    const scheduledDateTime = new Date(date!)
    const [hours, minutes] = time.split(":")
    scheduledDateTime.setHours(Number.parseInt(hours), Number.parseInt(minutes))

    const selectedGroupData = groups.find((g) => g.id === selectedGroup)

    const scheduleData = {
      message,
      group: selectedGroupData?.name || selectedGroup,
      scheduledTime: scheduledDateTime,
      occurrences: isInfinite ? -1 : occurrences,
      recurrenceType,
      weekdays: recurrenceType === 'weekly' ? selectedWeekdays : undefined,
      images: uploadedImages
    }

    onSchedule({
      content: scheduleData.message,
      groupName: scheduleData.group,
      scheduledTime: scheduleData.scheduledTime.toISOString(),
      occurrences: scheduleData.occurrences,
      recurrenceType: scheduleData.recurrenceType,
      weekdays: scheduleData.weekdays,
      images: uploadedImages
    })

    // Reset form and close modal
    clearForm()
    setIsScheduleModalOpen(false)
  }

  const characterCount = message.length
  const isOverLimit = characterCount > 1000

  return (
    <Card className="bg-neutral-900 border-neutral-800 h-full flex flex-col">
      <CardHeader className="pb-2 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-white text-base">
          <Send className="h-4 w-4 text-[#05c997]" />
          <span className="hidden sm:inline">Message Composer</span>
          <span className="sm:hidden">Compose</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 px-4 pb-4">
        {/* Replace the recipient phone number input section with: */}
        <div className="space-y-1">
          <Label htmlFor="group" className="text-gray-300 text-sm">
            Select Group
          </Label>
          <Select value={selectedGroup} onValueChange={setSelectedGroup} disabled={!isConnected}>
            <SelectTrigger
              className={cn("bg-neutral-800 border-neutral-700 text-white", errors.group && "border-red-500")}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <SelectValue placeholder={groups.length > 0 ? "Choose a group to message" : "No groups available"} />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-neutral-800 border-neutral-700">
              {groups.length > 0 ? (
                <>
                  {/* Favorites Section */}
                  {favoriteGroups.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-yellow-400 border-b border-neutral-700">
                        ⭐ Favorites
                      </div>
                      {groups
                        .filter(group => favoriteGroups.includes(group.id))
                        .map((group) => (
                          <SelectItem
                            key={group.id}
                            value={group.id}
                            className="text-white hover:bg-neutral-700 focus:bg-neutral-700"
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex flex-col items-start">
                                <div className="flex items-center gap-2">
                                  <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                                  <span className="font-medium">{group.name}</span>
                                </div>
                                <span className="text-xs text-gray-400 ml-5">{group.memberCount || 0} members</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-neutral-600"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  toggleFavorite(group.id)
                                }}
                              >
                                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                              </Button>
                            </div>
                          </SelectItem>
                        ))
                      }
                      <div className="border-b border-neutral-700 my-1" />
                    </>
                  )}

                  {/* All Groups Section */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-400">
                    All Groups
                  </div>
                  {groups.map((group) => (
                    <SelectItem
                      key={group.id}
                      value={group.id}
                      className="text-white hover:bg-neutral-700 focus:bg-neutral-700"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col items-start">
                          <div className="flex items-center gap-2">
                            {favoriteGroups.includes(group.id) ? (
                              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                            ) : (
                              <div className="h-3 w-3" />
                            )}
                            <span className="font-medium">{group.name}</span>
                          </div>
                          <span className="text-xs text-gray-400 ml-5">{group.memberCount || 0} members</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-neutral-600"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleFavorite(group.id)
                          }}
                        >
                          {favoriteGroups.includes(group.id) ? (
                            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                          ) : (
                            <Star className="h-3 w-3 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </SelectItem>
                  ))}
                </>
              ) : (
                <SelectItem value="no-groups" disabled className="text-gray-400">
                  No groups available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {errors.group && <p className="text-sm text-red-400">{errors.group}</p>}
        </div>

        <div className="space-y-1 flex-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="message" className="text-gray-300 text-sm">
              Message
            </Label>
            <span className={cn("text-xs", isOverLimit ? "text-red-400" : "text-gray-400")}>{characterCount}/1000</span>
          </div>

          {/* Text Formatting Toolbar */}
          <div className="flex items-center gap-1 p-2 border border-neutral-700 rounded-md bg-neutral-800/50">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => formatText('bold')}
              className="h-8 w-8 p-0 hover:bg-neutral-700 text-gray-400 hover:text-white"
              disabled={!isConnected}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => formatText('italic')}
              className="h-8 w-8 p-0 hover:bg-neutral-700 text-gray-400 hover:text-white"
              disabled={!isConnected}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => formatText('underline')}
              className="h-8 w-8 p-0 hover:bg-neutral-700 text-gray-400 hover:text-white"
              disabled={!isConnected}
            >
              <Underline className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => formatText('strikethrough')}
              className="h-8 w-8 p-0 hover:bg-neutral-700 text-gray-400 hover:text-white"
              disabled={!isConnected}
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
            <div className="h-4 w-px bg-neutral-600 mx-2" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 w-8 p-0 hover:bg-neutral-700 text-gray-400 hover:text-white"
              disabled={!isConnected}
            >
              <Image className="h-4 w-4" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          <Textarea
            ref={textareaRef}
            id="message"
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={cn(
              "min-h-[80px] sm:min-h-[100px] bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-400 resize-none text-sm",
              errors.message && "border-red-500",
            )}
            disabled={!isConnected}
          />

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 border border-neutral-700 rounded-md bg-neutral-800/20">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-16 h-16 object-cover rounded border border-neutral-600"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-400">
              {uploadedImages.length > 0 && (
                <span>{uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''} • </span>
              )}
            </div>
            {(errors.message || errors.images) && (
              <p className="text-xs text-red-400">{errors.message || errors.images}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          {/* Update the button disabled conditions to use selectedGroup */}
          <Button
            onClick={handleSendNow}
            disabled={!isConnected || !message.trim() || !selectedGroup}
            className="flex-1 bg-[#05c997] hover:bg-[#04b085] text-white transition-all duration-200 hover:scale-105 h-9 text-sm"
          >
            <Send className="h-3 w-3 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Send Now</span>
            <span className="sm:hidden">Send</span>
          </Button>

          <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                disabled={!isConnected || !message.trim() || !selectedGroup}
                className="flex-1 border-neutral-700 hover:bg-neutral-800 text-white transition-all duration-200 hover:scale-105 bg-transparent h-9 text-sm"
              >
                <Clock className="h-3 w-3 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Schedule</span>
                <span className="sm:hidden">Later</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-neutral-900 border-neutral-800 text-white">
              <DialogHeader>
                <DialogTitle>Schedule Message</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-neutral-800 border-neutral-700",
                          !date && "text-gray-400",
                          errors.date && "border-red-500",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-neutral-900 border-neutral-800">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        disabled={(date) => {
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          const selectedDate = new Date(date)
                          selectedDate.setHours(0, 0, 0, 0)
                          return selectedDate < today
                        }}
                        initialFocus
                        className="bg-neutral-900"
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.date && <p className="text-sm text-red-400">{errors.date}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Select Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className={cn("bg-neutral-800 border-neutral-700 text-white", errors.time && "border-red-500")}
                  />
                  {errors.time && <p className="text-sm text-red-400">{errors.time}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Recurrence Type</Label>
                  <Select value={recurrenceType} onValueChange={(value: 'once' | 'weekly') => {
                    setRecurrenceType(value)
                    if (value === 'once') {
                      setSelectedWeekdays([])
                    }
                  }}>
                    <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      <SelectItem value="once" className="text-white hover:bg-neutral-700">Send Once</SelectItem>
                      <SelectItem value="weekly" className="text-white hover:bg-neutral-700">Weekly Recurrence</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recurrenceType === 'weekly' && (
                  <div className="space-y-2">
                    <Label>Select Weekdays</Label>
                    <div className="grid grid-cols-7 gap-1">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                        const isSelected = selectedWeekdays.includes(index)
                        return (
                          <Button
                            key={day}
                            type="button"
                            size="sm"
                            variant={isSelected ? "default" : "outline"}
                            className={cn(
                              "h-8 text-xs",
                              isSelected
                                ? "bg-[#05c997] hover:bg-[#04b085] text-white"
                                : "border-neutral-600 text-neutral-300 hover:bg-neutral-700"
                            )}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedWeekdays(prev => prev.filter(d => d !== index))
                              } else {
                                setSelectedWeekdays(prev => [...prev, index])
                              }
                            }}
                          >
                            {day}
                          </Button>
                        )
                      })}
                    </div>
                    {errors.weekdays && <p className="text-sm text-red-400">{errors.weekdays}</p>}
                    <p className="text-xs text-gray-500">Select the days of the week when the message should be sent</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="occurrences">Number of Occurrences</Label>

                  <div className="flex items-center space-x-2 mb-3">
                    <Checkbox
                      id="infinite"
                      checked={isInfinite}
                      onCheckedChange={(checked) => {
                        setIsInfinite(checked as boolean)
                        if (checked) {
                          setOccurrences(1)
                        }
                      }}
                      className="border-neutral-600 data-[state=checked]:bg-[#05c997] data-[state=checked]:border-[#05c997]"
                    />
                    <Label htmlFor="infinite" className="text-sm text-gray-300 flex items-center gap-1">
                      <Infinity className="h-4 w-4" />
                      Infinite occurrences
                    </Label>
                  </div>

                  {!isInfinite && (
                    <div className="flex items-center gap-2">
                      <Input
                        id="occurrences"
                        type="number"
                        min="1"
                        max="100"
                        value={occurrences}
                        onChange={(e) => setOccurrences(Number.parseInt(e.target.value) || 1)}
                        className={cn("bg-neutral-800 border-neutral-700 text-white", errors.occurrences && "border-red-500")}
                      />
                      <span className="text-sm text-gray-400 whitespace-nowrap">times</span>
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    {isInfinite
                      ? "Message will be sent repeatedly until manually stopped"
                      : recurrenceType === 'weekly'
                        ? "How many weeks should this pattern repeat? (1-100)"
                        : "How many times should this message be sent? (1-100)"
                    }
                  </p>
                  {errors.occurrences && <p className="text-sm text-red-400">{errors.occurrences}</p>}
                </div>

                {errors.datetime && <p className="text-sm text-red-400">{errors.datetime}</p>}

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="flex-1 border-neutral-700 hover:bg-neutral-800"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSchedule} className="flex-1 bg-[#05c997] hover:bg-[#04b085]">
                    Schedule Message
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!isConnected && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">Connect to WhatsApp to start sending messages</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
