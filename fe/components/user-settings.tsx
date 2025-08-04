"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Settings, User, Mail, Lock, Save, Edit3 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface UserSettingsProps {
  onOpenAuthModal: () => void
}

export function UserSettings({ onOpenAuthModal }: UserSettingsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [userEmail, setUserEmail] = useState("user@example.com")
  const [userName, setUserName] = useState("John Doe")
  const [tempEmail, setTempEmail] = useState(userEmail)
  const [tempName, setTempName] = useState(userName)
  const { toast } = useToast()

  const handleSave = () => {
    setUserEmail(tempEmail)
    setUserName(tempName)
    setIsEditing(false)
    toast({
      title: "Settings Updated",
      description: "Your profile settings have been saved successfully.",
    })
  }

  const handleCancel = () => {
    setTempEmail(userEmail)
    setTempName(userName)
    setIsEditing(false)
  }

  const handleChangePassword = () => {
    onOpenAuthModal()
  }

  return (
    <Card className="bg-neutral-900 border-neutral-800 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white text-sm sm:text-base">
          <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-[#05c997]" />
          User Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Profile Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-gray-300 font-medium">Profile</Label>
            <Badge variant="secondary" className="bg-[#05c997]/10 text-[#05c997] border border-[#05c997]/20 text-xs">
              Active
            </Badge>
          </div>

          <div className="space-y-3">
            {/* Name Field */}
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs text-gray-400">
                Full Name
              </Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="bg-neutral-800 border-neutral-700 text-white text-sm h-8"
                  placeholder="Enter your full name"
                />
              ) : (
                <div className="flex items-center gap-2 p-2 bg-neutral-800 rounded-md border border-neutral-700">
                  <User className="h-3 w-3 text-gray-400" />
                  <span className="text-white text-sm">{userName}</span>
                </div>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs text-gray-400">
                Email Address
              </Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={tempEmail}
                  onChange={(e) => setTempEmail(e.target.value)}
                  className="bg-neutral-800 border-neutral-700 text-white text-sm h-8"
                  placeholder="Enter your email"
                />
              ) : (
                <div className="flex items-center gap-2 p-2 bg-neutral-800 rounded-md border border-neutral-700">
                  <Mail className="h-3 w-3 text-gray-400" />
                  <span className="text-white text-sm">{userEmail}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator className="bg-neutral-700" />

        {/* Action Buttons */}
        <div className="space-y-2">
          {isEditing ? (
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                size="sm"
                className="flex-1 bg-[#05c997] hover:bg-[#04b085] text-white h-8 text-xs"
              >
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button
                onClick={handleCancel}
                size="sm"
                variant="outline"
                className="flex-1 border-neutral-700 hover:bg-neutral-800 text-gray-300 hover:text-white h-8 text-xs"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              size="sm"
              variant="outline"
              className="w-full border-neutral-700 hover:bg-neutral-800 text-gray-300 hover:text-white h-8 text-xs"
            >
              <Edit3 className="h-3 w-3 mr-1" />
              Edit Profile
            </Button>
          )}

          <Button
            onClick={handleChangePassword}
            size="sm"
            variant="outline"
            className="w-full border-neutral-700 hover:bg-neutral-800 text-gray-300 hover:text-white h-8 text-xs"
          >
            <Lock className="h-3 w-3 mr-1" />
            Change Password
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}