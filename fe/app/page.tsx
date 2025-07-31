"use client"

import { useState, useEffect } from "react"
import { WhatsAppStatus } from "@/components/whatsapp-status"
import { MessageComposer } from "@/components/message-composer"
import { ScheduledMessages } from "@/components/scheduled-messages"
import { ActivityLog } from "@/components/activity-log"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function Dashboard() {
  // Authentication disabled for testing
  const [isAuthenticated, setIsAuthenticated] = useState(true)
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
            status: "pending"
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
  }

  const handleScheduleMessage = async (data: {
    content: string
    groupName: string
    scheduledTime: string
    occurrences: number
    recurrenceType: 'once' | 'weekly'
    weekdays?: number[]
    images?: File[]
  }) => {
    try {
      const formData = new FormData()
      formData.append('groupName', data.groupName)
      formData.append('message', data.content)
      formData.append('cronTime', convertDateTimeToCron(new Date(data.scheduledTime)))
      formData.append('occurrences', data.occurrences.toString())
      formData.append('recurrenceType', data.recurrenceType)

      if (data.weekdays) {
        formData.append('weekdays', JSON.stringify(data.weekdays))
      }

      const description = data.recurrenceType === 'weekly'
        ? `Weekly on ${data.weekdays?.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}${data.occurrences === -1 ? ' (infinite)' : ` (${data.occurrences} weeks)`}`
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

        const scheduleText = data.recurrenceType === 'weekly'
          ? `weekly on ${data.weekdays?.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}${data.occurrences === -1 ? ' (infinite)' : ` for ${data.occurrences} weeks`}`
          : (data.occurrences === -1 ? ' (infinite times)' : (data.occurrences > 1 ? ` (${data.occurrences} times)` : ''))

        const imageText = data.images && data.images.length > 0 ? ` with ${data.images.length} image${data.images.length > 1 ? 's' : ''}` : ''

        addActivityLog({
          message: `Message scheduled for ${data.groupName}${imageText} ${data.recurrenceType === 'weekly' ? scheduleText : `on ${new Date(data.scheduledTime).toLocaleString()}${scheduleText}`}`,
          type: "scheduled",
          status: "success"
        })

        toast({
          title: "Message Scheduled",
          description: data.recurrenceType === 'weekly'
            ? `Your message${imageText} will be sent to ${data.groupName} ${scheduleText} starting ${new Date(data.scheduledTime).toLocaleString()}`
            : `Your message${imageText} will be sent to ${data.groupName} on ${new Date(data.scheduledTime).toLocaleString()}${scheduleText}`,
        })
      } else {
        throw new Error(result.error || 'Failed to schedule message')
      }
    } catch (error) {
      console.error('Error scheduling message:', error as Error)
      addActivityLog({
        message: `Failed to schedule message for ${data.groupName}: ${(error as Error).message}`,
        type: "error",
        status: "error"
      })

      toast({
        title: "Scheduling failed",
        description: (error as Error).message,
        variant: "destructive",
      })
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
    recurrenceType: 'once' | 'weekly'
    weekdays?: number[]
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

        {/* Responsive Grid Layout - Optimized for single screen */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 grid-rows-1 lg:grid-rows-2 gap-2 sm:gap-3 lg:gap-4 min-h-0 overflow-hidden">
          {/* WhatsApp Status - Compact on mobile, left column on desktop */}
          <div className="lg:col-span-3 lg:row-span-1 h-fit">
            <WhatsAppStatus
              isConnected={isWhatsAppConnected}
              onConnectionChange={setIsWhatsAppConnected}
              onRefresh={checkWhatsAppStatus}
              onPromoteBot={handlePromoteBot}
            />
          </div>

          {/* Message Composer - Main center area spanning 2 rows */}
          <div className="lg:col-span-5 lg:row-span-2 h-fit lg:h-full">
            <MessageComposer
              onSchedule={handleScheduleMessage}
              onSendNow={handleSendNow}
              isConnected={isWhatsAppConnected}
              groups={groups}
            />
          </div>

          {/* Scheduled Messages - Top right */}
          <div className="lg:col-span-4 lg:row-span-1 min-h-0">
            <ScheduledMessages messages={scheduledMessages} onDelete={handleDeleteScheduled} />
          </div>

          {/* Activity Log - Bottom right */}
          <div className="lg:col-span-4 lg:row-span-1 min-h-0">
            <ActivityLog activities={activityLog} />
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  )
}
