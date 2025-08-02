"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Clock, Trash2, Edit, MessageSquare, Users, Infinity } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"

interface ScheduledMessage {
  id: string
  content: string
  scheduledTime: Date
  groupId: string
  groupName: string
  memberCount: number
  status: "pending" | "sent" | "failed"
}

interface ScheduledMessagesProps {
  messages: Array<{
    id: string
    content: string
    scheduledTime: Date
    groupName: string
    status: "pending" | "sent" | "failed"
    description?: string
    memberCount?: number
    occurrences?: number
    recurrenceType?: 'once' | 'weekly'
    weekdays?: number[]
  }>
  onDelete: (id: string) => void
  onEdit: (message: {
    id: string
    content: string
    scheduledTime: Date
    groupName: string
    occurrences?: number
    recurrenceType?: 'once' | 'weekly'
    weekdays?: number[]
  }) => void
  isLoading?: boolean
}

export function ScheduledMessages({ messages, onDelete, onEdit, isLoading }: ScheduledMessagesProps) {
  const formatScheduledTime = (date: Date) => {
    // Check if date is valid
    if (!date || isNaN(date.getTime())) {
      return "Invalid date"
    }

    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString()

    if (isToday) {
      return `Today at ${format(date, "h:mm a")}`
    } else if (isTomorrow) {
      return `Tomorrow at ${format(date, "h:mm a")}`
    } else {
      return format(date, "MMM d, yyyy 'at' h:mm a")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "sent":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-neutral-500/20 text-neutral-400 border-neutral-500/30"
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-neutral-900 border-neutral-800 h-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-white">
            <Clock className="h-5 w-5 text-[#05c997]" />
            Scheduled Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3 p-4 bg-neutral-800 rounded-lg">
              <Skeleton className="h-4 w-3/4 bg-neutral-700" />
              <Skeleton className="h-3 w-1/2 bg-neutral-700" />
              <Skeleton className="h-3 w-1/3 bg-neutral-700" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-neutral-900 border-neutral-700 h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-white text-sm sm:text-base">
          <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
          Scheduled Messages
          {messages.length > 0 && (
            <Badge variant="secondary" className="ml-auto bg-neutral-800 text-neutral-200 text-xs">
              {messages.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {messages.length === 0 ? (
          <div className="text-center py-4 space-y-2">
            <div className="w-12 h-12 mx-auto bg-neutral-800 rounded-full flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-neutral-600" />
            </div>
            <div>
              <p className="text-neutral-400 font-medium text-sm">No scheduled messages</p>
              <p className="text-xs text-neutral-500 mt-1 hidden sm:block">Schedule your first message to get started</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
            {messages.map((message) => (
              <div
                key={message.id}
                className="p-3 bg-neutral-800 rounded-lg border border-neutral-700 hover:border-neutral-600 transition-all duration-200 group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs sm:text-sm font-medium line-clamp-2 leading-relaxed">{message.content}</p>
                    </div>
                    <Badge className={`${getStatusColor(message.status)} text-xs`}>{message.status}</Badge>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-neutral-400">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span className="truncate">
                        {message.groupName} <span className="hidden sm:inline">({message.memberCount || 0} members)</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">{formatScheduledTime(message.scheduledTime)}</span>
                    </div>
                    {((message.occurrences && (message.occurrences > 1 || message.occurrences === -1)) || message.recurrenceType === 'weekly') && (
                      <div className="flex items-center gap-1">
                        {message.recurrenceType === 'weekly' && message.weekdays && (
                          <Badge variant="outline" className="text-xs px-1 py-0 h-4 border-blue-600 text-blue-300 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{message.weekdays.map(d => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d]).join('')}</span>
                          </Badge>
                        )}
                        {message.occurrences && (message.occurrences > 1 || message.occurrences === -1) && (
                          <Badge variant="outline" className="text-xs px-1 py-0 h-4 border-neutral-600 text-neutral-300 flex items-center gap-1">
                            {message.occurrences === -1 ? (
                              <>
                                <Infinity className="h-3 w-3" />
                                <span>∞</span>
                              </>
                            ) : (
                              `${message.occurrences}${message.recurrenceType === 'weekly' ? 'w' : 'x'}`
                            )}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-neutral-500 hidden sm:block">
                    {formatDistanceToNow(message.scheduledTime, { addSuffix: true })}
                  </div>

                  <div className="flex items-center gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit({
                        id: message.id,
                        content: message.content,
                        scheduledTime: message.scheduledTime,
                        groupName: message.groupName,
                        occurrences: message.occurrences,
                        recurrenceType: message.recurrenceType,
                        weekdays: message.weekdays
                      })}
                      className="h-6 px-2 text-neutral-400 hover:text-white hover:bg-neutral-700 text-xs"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(message.id)}
                      className="h-6 px-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
