"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Activity, CheckCircle, XCircle, Clock, Wifi } from "lucide-react"
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns"

interface ActivityItem {
  id: string
  message: string
  timestamp: Date
  type: "sent" | "scheduled" | "connection" | "error"
  status: "success" | "error" | "pending"
  details?: string
}

interface ActivityLogProps {
  activities: ActivityItem[]
  isLoading?: boolean
}

export function ActivityLog({ activities, isLoading }: ActivityLogProps) {
  const getActivityIcon = (type: string, status: string, message: string) => {
    // Check if it's an instant message
    const isInstant = message.includes('sent instantly')

    switch (type) {
      case "sent":
        if (isInstant) {
          return status === "success" ? (
            <CheckCircle className="h-4 w-4 text-green-400" />
          ) : (
            <XCircle className="h-4 w-4 text-red-400" />
          )
        } else {
          // Scheduled message that was sent
          return status === "success" ? (
            <div className="relative">
              <Clock className="h-4 w-4 text-blue-400" />
              <CheckCircle className="h-2 w-2 text-green-400 absolute -top-1 -right-1" />
            </div>
          ) : (
            <div className="relative">
              <Clock className="h-4 w-4 text-blue-400" />
              <XCircle className="h-2 w-2 text-red-400 absolute -top-1 -right-1" />
            </div>
          )
        }
      case "scheduled":
        return <Clock className="h-4 w-4 text-yellow-400" />
      case "connection":
        return <Wifi className="h-4 w-4 text-[#05c997]" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-400" />
      default:
        return <Activity className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "error":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const formatTimestamp = (date: Date) => {
    if (isToday(date)) {
      return format(date, "h:mm a")
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, "h:mm a")}`
    } else {
      return format(date, "MMM d, h:mm a")
    }
  }

  const groupActivitiesByDate = (activities: ActivityItem[]) => {
    const groups: Record<string, ActivityItem[]> = {}

    activities.forEach((activity) => {
      let dateKey: string
      if (isToday(activity.timestamp)) {
        dateKey = "Today"
      } else if (isYesterday(activity.timestamp)) {
        dateKey = "Yesterday"
      } else {
        dateKey = format(activity.timestamp, "MMMM d, yyyy")
      }

      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(activity)
    })

    return groups
  }

  if (isLoading) {
    return (
      <Card className="bg-neutral-900 border-neutral-800 h-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-white">
            <Activity className="h-5 w-5 text-[#05c997]" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full bg-neutral-800" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-neutral-800" />
                <Skeleton className="h-3 w-1/2 bg-neutral-800" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const groupedActivities = groupActivitiesByDate(activities)

  return (
    <Card className="bg-neutral-900 border-neutral-700 h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-white text-sm sm:text-base">
          <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
          Activity Log
          {activities.length > 0 && (
            <Badge variant="secondary" className="ml-auto bg-neutral-800 text-neutral-200 text-xs">
              {activities.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {activities.length === 0 ? (
          <div className="text-center py-4 space-y-2">
            <div className="w-12 h-12 mx-auto bg-neutral-800 rounded-full flex items-center justify-center">
              <Activity className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-gray-400 font-medium text-sm">No activity yet</p>
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">Your activity will appear here</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
            {Object.entries(groupedActivities).map(([dateGroup, groupActivities]) => (
              <div key={dateGroup} className="space-y-2">
                <h4 className="text-xs font-medium text-gray-400 sticky top-0 bg-neutral-900 py-1">{dateGroup}</h4>
                <div className="space-y-2">
                  {groupActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-2 p-2 sm:p-3 bg-neutral-800 rounded-lg border border-neutral-700 hover:border-neutral-600 transition-colors"
                    >
                      <div className="flex-shrink-0 mt-0.5">{getActivityIcon(activity.type, activity.status, activity.message)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs sm:text-sm text-white leading-relaxed line-clamp-2">{activity.message}</p>
                          <div className="flex gap-1 flex-wrap">
                            <Badge className={`${getStatusColor(activity.status)} text-xs`}>{activity.status}</Badge>
                            {activity.message.includes('sent instantly') && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-green-500/10 text-green-400 border-green-500/20"
                              >
                                instant
                              </Badge>
                            )}
                            {activity.type === 'scheduled' && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20"
                              >
                                scheduled
                              </Badge>
                            )}
                          </div>
                        </div>
                        {activity.details && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{activity.details}</p>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                          <span className="text-xs text-gray-400">{formatTimestamp(activity.timestamp)}</span>
                          <span className="text-xs text-gray-500 hidden sm:block">
                            ({formatDistanceToNow(activity.timestamp, { addSuffix: true })})
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
