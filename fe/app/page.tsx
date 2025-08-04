"use client"

import { useState, useEffect } from "react"
import { WhatsAppStatus } from "@/components/whatsapp-status"
import { MessageComposer } from "@/components/message-composer"
import { ScheduledMessages } from "@/components/scheduled-messages"
import { ActivityLog } from "@/components/activity-log"
import { UserSettings } from "@/components/user-settings"
import { AuthModal } from "@/components/auth-modal"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function Dashboard() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false)
  const [scheduledMessages, setScheduledMessages] = useState<Array<{
    id: string
    content: string
    scheduledTime: Date
    groupId: string
    groupName: string
    memberCount: number
    status: "pending" | "sent" | "failed"
  }>>([])
  const [activityLog, setActivityLog] = useState<Array<{
    id: string
    timestamp: Date
    type: "sent" | "scheduled" | "connection" | "error"
    message: string
    status: "success" | "error" | "pending"
    details?: string
  }>>([])
  const [groups, setGroups] = useState([])
  const [editingMessage, setEditingMessage] = useState<{
    id: string
    content: string
    scheduledTime: Date
    groupName: string
    occurrences?: number
    recurrenceType?: 'once' | 'weekly'
    weekdays?: number[]
  } | null>(null)
  const { toast } = useToast()

  // Fetch WhatsApp status
  const checkWhatsAppStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/status`)
      const data = await response.json()
      setIsWhatsAppConnected(data.isReady)

      if (data.isReady) {
        addActivityLog({
          message: "WhatsApp connection established",
          type: "connection",
          status: "success"
        })
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error)
      addActivityLog({
        message: "Failed to check WhatsApp status",
        type: "error",
        status: "error"
      })
    }
  }

  // Fetch scheduled messages
  const fetchScheduledMessages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/scheduled`)
      const data = await response.json()
      if (data.success) {
        const formattedMessages = data.scheduledMessages.map((msg: any) => {
          // Parse the scheduled time safely
          let scheduledTime = new Date()
          if (msg.scheduledTime) {
            scheduledTime = new Date(msg.scheduledTime)
          } else if (msg.createdAt) {
            scheduledTime = new Date(msg.createdAt)
          }

          // If date is still invalid, use current time
          if (isNaN(scheduledTime.getTime())) {
            scheduledTime = new Date()
          }

          return {
            id: msg.id,
            content: msg.message,
            scheduledTime,
            groupId: msg.groupName,
            groupName: msg.groupName,
            memberCount: 0, // Will be updated when we fetch groups
            status: msg.status || "pending"
          }
        })
        setScheduledMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Error fetching scheduled messages:', error)
    }
  }

  // Fetch available groups
  const fetchGroups = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups`)
      const data = await response.json()
      if (data.success) {
        setGroups(data.groups)
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
    }
  }

  // Add activity log entry
  const addActivityLog = (activity: {
    type: "sent" | "scheduled" | "connection" | "error"
    message: string
    status: "success" | "error" | "pending"
    details?: string
  }) => {
    const newActivity = {
      id: Date.now().toString(),
      timestamp: new Date(),
      ...activity
    }
    setActivityLog(prev => [newActivity, ...prev])
  }

  useEffect(() => {
    // Initial data fetch
    checkWhatsAppStatus()
    fetchScheduledMessages()
    fetchGroups()

    // Set up polling for WhatsApp status
    const statusInterval = setInterval(checkWhatsAppStatus, 10000) // Check every 10 seconds
    const messagesInterval = setInterval(fetchScheduledMessages, 30000) // Check every 30 seconds

    return () => {
      clearInterval(statusInterval)
      clearInterval(messagesInterval)
    }
  }, [])

  const handleLogout = () => {
    setIsAuthenticated(false)
    setIsWhatsAppConnected(false)
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    })
    addActivityLog({
      message: "User logged out",
      type: "connection",
      status: "success"
    })
  }

  const handleLogin = (token: string) => {
    setIsAuthenticated(true)
    setShowAuthModal(false)
    addActivityLog({
      message: "User logged in successfully",
      type: "connection",
      status: "success"
    })
  }

  const handleOpenAuthModal = () => {
    setShowAuthModal(true)
  }

  const handleScheduleMessage = async (data: {
    content: string
    groupName: string
    scheduledFor: Date
    recurrence?: {
      type: 'weekly'
      occurrences?: number
      isInfinite?: boolean
      weekdays?: number[]
    }
    images?: File[]
  }) => {
    try {
      const formData = new FormData()
      formData.append('groupName', data.groupName)
      formData.append('message', data.content)
      formData.append('cronTime', convertDateTimeToCron(data.scheduledFor))
      formData.append('occurrences', (data.recurrence?.occurrences || 1).toString())
      formData.append('recurrenceType', data.recurrence?.type || 'once')

      if (data.recurrence?.weekdays) {
        formData.append('weekdays', JSON.stringify(data.recurrence.weekdays))
      }

      const description = data.recurrenceType === 'weekly'
        ? `Weekly on ${data.weekdays?.map((d: number) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}${data.occurrences === -1 ? ' (infinite)' : ` (${data.occurrences} weeks)`}`
        : (data.occurrences === -1 ? 'Infinite occurrences' : (data.occurrences > 1 ? `Repeat ${data.occurrences} times` : ''))

      formData.append('description', description)

      // Add images if any
      if (data.images && data.images.length > 0) {
        data.images.forEach((image) => {
          formData.append('images', image)
        })
      }

      const response = await fetch(`${API_BASE_URL}/api/messages/schedule`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        // Refresh scheduled messages
        fetchScheduledMessages()

        const scheduleText = data.recurrence?.type === 'weekly'
          ? `weekly on ${data.recurrence?.weekdays?.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}${(data.recurrence?.occurrences || 1) === -1 ? ' (infinite)' : ` for ${data.recurrence?.occurrences} weeks`}`
          : ((data.recurrence?.occurrences || 1) === -1 ? ' (infinite times)' : ((data.recurrence?.occurrences || 1) > 1 ? ` (${data.recurrence?.occurrences} times)` : ''))

        const imageText = data.images && data.images.length > 0 ? ` with ${data.images.length} image${data.images.length > 1 ? 's' : ''}` : ''

        addActivityLog({
          message: `Message scheduled for ${data.groupName}${imageText} ${data.recurrence?.type === 'weekly' ? scheduleText : `on ${data.scheduledFor.toLocaleString()}${scheduleText}`}`,
          type: "scheduled",
          status: "success"
        })

        toast({
          title: "Message Scheduled",
          description: data.recurrence?.type === 'weekly'
            ? `Your message${imageText} will be sent to ${data.groupName} ${scheduleText} starting ${data.scheduledFor.toLocaleString()}`
            : `Your message${imageText} will be sent to ${data.groupName} on ${data.scheduledFor.toLocaleString()}${scheduleText}`,
        })
      } else {
        // Check if it's a session-related error
        if (result.details && (result.details.includes('Session closed') || result.details.includes('Protocol error'))) {
          throw new Error('WhatsApp session disconnected. Please wait for reconnection and try again.')
        }
        throw new Error(result.error || 'Failed to schedule message')
      }
    } catch (error) {
      console.error('Error scheduling message:', error as Error)
      const errorMessage = (error as Error).message

      // Check if it's a session-related error
      const isSessionError = errorMessage.includes('Session closed') ||
        errorMessage.includes('Protocol error') ||
        errorMessage.includes('session disconnected')

      addActivityLog({
        message: `Failed to schedule message for ${data.groupName}: ${errorMessage}`,
        type: "error",
        status: "error"
      })

      toast({
        title: isSessionError ? "Connection Issue" : "Scheduling failed",
        description: isSessionError
          ? "WhatsApp session disconnected. The system will attempt to reconnect automatically. Please try again in a few moments."
          : errorMessage,
        variant: "destructive",
      })

      // If it's a session error, try to trigger a reconnection
      if (isSessionError) {
        try {
          await fetch(`${API_BASE_URL}/api/whatsapp/reconnect`, {
            method: 'POST'
          })
        } catch (reconnectError) {
          console.error('Failed to trigger reconnection:', reconnectError)
        }
      }
    }
  }

  // Convert Date/Time to cron expression (simplified)
  const convertDateTimeToCron = (dateTime: Date) => {
    const minute = dateTime.getMinutes()
    const hour = dateTime.getHours()
    const day = dateTime.getDate()
    const month = dateTime.getMonth() + 1
    const year = dateTime.getFullYear()

    // For one-time execution, we'll use a specific date cron
    return `${minute} ${hour} ${day} ${month} *`
  }

  const handleSendNow = async (data: {
    content: string
    groupName: string
    recurrence?: {
      type: 'once' | 'weekly'
      occurrences?: number
      isInfinite?: boolean
      weekdays?: number[]
    }
    images?: File[]
  }) => {
    try {
      const formData = new FormData()
      formData.append('groupName', data.groupName)
      formData.append('message', data.content)

      // Add images if any
      if (data.images && data.images.length > 0) {
        data.images.forEach((image) => {
          formData.append('images', image)
        })
      }

      const response = await fetch(`${API_BASE_URL}/api/messages/send`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        const imageText = data.images && data.images.length > 0 ? ` with ${data.images.length} image${data.images.length > 1 ? 's' : ''}` : ''

        addActivityLog({
          message: `Message sent instantly to ${data.groupName}${imageText}`,
          type: "sent",
          status: "success"
        })

        toast({
          title: "Message sent",
          description: `Your message${imageText} was sent to ${data.groupName}`,
        })
      } else {
        throw new Error(result.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error as Error)
      addActivityLog({
        message: `Failed to send message to ${data.groupName}: ${(error as Error).message}`,
        type: "error",
        status: "error"
      })

      toast({
        title: "Send failed",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const handleDeleteScheduled = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/scheduled/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        // Refresh scheduled messages
        fetchScheduledMessages()

        addActivityLog({
          message: "Scheduled message deleted",
          type: "scheduled",
          status: "success"
        })

        toast({
          title: "Message deleted",
          description: "The scheduled message has been removed",
        })
      } else {
        throw new Error(data.error || 'Failed to delete message')
      }
    } catch (error) {
      console.error('Error deleting message:', error as Error)
      addActivityLog({
        message: `Failed to delete scheduled message: ${(error as Error).message}`,
        type: "error",
        status: "error"
      })

      toast({
        title: "Delete failed",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const handleEditScheduled = (message: {
    id: string
    content: string
    scheduledTime: Date
    groupName: string
    occurrences?: number
    recurrenceType?: 'once' | 'weekly'
    weekdays?: number[]
  }) => {
    setEditingMessage({
      id: message.id,
      content: message.content,
      scheduledTime: message.scheduledTime,
      groupName: message.groupName,
      occurrences: message.occurrences || 1,
      recurrenceType: message.recurrenceType || 'once',
      weekdays: message.weekdays || []
    });
  }

  const handleCancelEdit = () => {
    setEditingMessage(null);
  }

  const handleUpdateScheduled = async (data: {
    content: string
    groupName: string
    scheduledFor: Date
    recurrence?: {
      type: 'weekly'
      occurrences?: number
      isInfinite?: boolean
      weekdays?: number[]
    }
    images?: File[]
  }) => {
    try {
      const formData = new FormData()
      formData.append('groupName', data.groupName)
      formData.append('message', data.content)
      formData.append('cronTime', convertDateTimeToCron(data.scheduledFor))
      formData.append('occurrences', (data.recurrence?.occurrences || 1).toString())
      formData.append('recurrenceType', data.recurrence?.type || 'once')

      if (data.recurrence?.weekdays) {
        formData.append('weekdays', JSON.stringify(data.recurrence.weekdays))
      }

      const description = data.recurrenceType === 'weekly'
        ? `Weekly on ${data.weekdays?.map((d: number) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}${data.occurrences === -1 ? ' (infinite)' : ` (${data.occurrences} weeks)`}`
        : (data.occurrences === -1 ? 'Infinite occurrences' : (data.occurrences > 1 ? `Repeat ${data.occurrences} times` : ''))

      formData.append('description', description)

      // Add images if any
      if (data.images && data.images.length > 0) {
        data.images.forEach((image) => {
          formData.append('images', image)
        })
      }

      const response = await fetch(`${API_BASE_URL}/api/messages/scheduled/${editingMessage?.id}`, {
        method: 'PUT',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        // Refresh scheduled messages
        fetchScheduledMessages()
        setEditingMessage(null)

        const scheduleText = data.recurrence?.type === 'weekly'
          ? `weekly on ${data.recurrence?.weekdays?.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}${(data.recurrence?.occurrences || 1) === -1 ? ' (infinite)' : ` for ${data.recurrence?.occurrences} weeks`}`
          : ((data.recurrence?.occurrences || 1) === -1 ? ' (infinite times)' : ((data.recurrence?.occurrences || 1) > 1 ? ` (${data.recurrence?.occurrences} times)` : ''))

        const imageText = data.images && data.images.length > 0 ? ` with ${data.images.length} image${data.images.length > 1 ? 's' : ''}` : ''

        addActivityLog({
          message: `Scheduled message updated for ${data.groupName}${imageText} ${data.recurrence?.type === 'weekly' ? scheduleText : `on ${data.scheduledFor.toLocaleString()}${scheduleText}`}`,
          type: "scheduled",
          status: "success"
        })

        toast({
          title: "Message Updated",
          description: data.recurrence?.type === 'weekly'
            ? `Your message${imageText} for ${data.groupName} has been updated to send ${scheduleText} starting ${data.scheduledFor.toLocaleString()}`
            : `Your message${imageText} for ${data.groupName} has been updated to send on ${data.scheduledFor.toLocaleString()}${scheduleText}`,
        })
      } else {
        // Check if it's a session-related error
        if (result.details && (result.details.includes('Session closed') || result.details.includes('Protocol error'))) {
          throw new Error('WhatsApp session disconnected. Please wait for reconnection and try again.')
        }
        throw new Error(result.error || 'Failed to update message')
      }
    } catch (error) {
      console.error('Error updating message:', error as Error)
      const errorMessage = (error as Error).message

      // Check if it's a session-related error
      const isSessionError = errorMessage.includes('Session closed') ||
        errorMessage.includes('Protocol error') ||
        errorMessage.includes('session disconnected')

      addActivityLog({
        message: `Failed to update scheduled message for ${data.groupName}: ${errorMessage}`,
        type: "error",
        status: "error"
      })

      toast({
        title: isSessionError ? "Connection Issue" : "Update failed",
        description: isSessionError
          ? "WhatsApp session disconnected. The system will attempt to reconnect automatically. Please try again in a few moments."
          : errorMessage,
        variant: "destructive",
      })

      // If it's a session error, try to trigger a reconnection
      if (isSessionError) {
        try {
          await fetch(`${API_BASE_URL}/api/whatsapp/reconnect`, {
            method: 'POST'
          })
        } catch (reconnectError) {
          console.error('Failed to trigger reconnection:', reconnectError)
        }
      }
    }
  }

  const handlePromoteBot = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/promote-bot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        addActivityLog({
          message: `Bot promotion complete: ${data.summary.promoted} groups promoted, ${data.summary.alreadyAdmin} already admin`,
          type: "connection",
          status: "success"
        })

        toast({
          title: "Bot Promotion Complete",
          description: `Promoted in ${data.summary.promoted} groups, already admin in ${data.summary.alreadyAdmin} groups`,
        })
      } else {
        throw new Error(data.error || 'Failed to promote bot')
      }
    } catch (error) {
      console.error('Error promoting bot:', error as Error)
      addActivityLog({
        message: `Failed to promote bot: ${(error as Error).message}`,
        type: "error",
        status: "error"
      })

      toast({
        title: "Promotion failed",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-2 sm:p-4 lg:p-6 overflow-hidden">
      <div className="max-w-7xl mx-auto h-screen flex flex-col">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4 flex-shrink-0">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">WhatsApp Scheduler</h1>
            <p className="text-gray-400 text-xs sm:text-sm hidden sm:block">Manage your scheduled messages</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-xs sm:text-sm text-gray-400">
              {isWhatsAppConnected ? (
                <span className="text-green-400">✅ Connected</span>
              ) : (
                <span className="text-red-400">❌ Disconnected</span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Responsive Grid Layout - Optimized bento grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 grid-rows-1 lg:grid-rows-2 gap-2 sm:gap-3 lg:gap-4 min-h-0 overflow-hidden">
          {/* Top Row */}
          {/* WhatsApp Status - Top left (1x1) */}
          <div className="lg:col-span-1 lg:row-span-1 min-h-0">
            <WhatsAppStatus
              isConnected={isWhatsAppConnected}
              onConnectionChange={setIsWhatsAppConnected}
              onRefresh={checkWhatsAppStatus}
              onPromoteBot={handlePromoteBot}
            />
          </div>

          {/* Message Composer - Top center (2x1) */}
          <div className="lg:col-span-2 lg:row-span-1 h-fit lg:h-full">
            <MessageComposer
              onSchedule={handleScheduleMessage}
              onSendNow={(data) => handleSendNow({ ...data, recurrence: { type: "once" }, images: data.images || [] })}
              onUpdate={handleUpdateScheduled}
              isConnected={isWhatsAppConnected}
              groups={groups}
              editingMessage={editingMessage ? {
                id: editingMessage.id,
                content: editingMessage.content,
                groupName: editingMessage.groupName,
                scheduledFor: editingMessage.scheduledTime,
                recurrence: editingMessage.recurrenceType === "weekly" ? {
                  type: "weekly",
                  occurrences: editingMessage.occurrences,
                  isInfinite: editingMessage.occurrences === -1,
                  weekdays: editingMessage.weekdays
                } : {
                  type: "once",
                  occurrences: 1
                }
              } : null}
              onCancelEdit={handleCancelEdit}
            />
          </div>

          {/* Scheduled Messages - Top right (1x1) */}
          <div className="lg:col-span-1 lg:row-span-1 min-h-0">
            <ScheduledMessages
              messages={scheduledMessages}
              onDelete={handleDeleteScheduled}
              onEdit={handleEditScheduled}
            />
          </div>

          {/* Bottom Row */}
          {/* User Settings - Bottom left (1x1) */}
          <div className="lg:col-span-1 lg:row-span-1 min-h-0">
            <UserSettings onOpenAuthModal={handleOpenAuthModal} />
          </div>

          {/* Empty space - Bottom center (2x1) */}
          <div className="lg:col-span-2 lg:row-span-1"></div>

          {/* Activity Log - Bottom right underneath Scheduled Messages (1x1) */}
          <div className="lg:col-span-1 lg:row-span-1 min-h-0">
            <ActivityLog activities={activityLog} />
          </div>
        </div>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
      />

      <Toaster />
    </div>
  )
}
