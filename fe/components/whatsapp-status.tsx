"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle, AlertCircle, RefreshCw, Smartphone } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface WhatsAppStatusProps {
  isConnected: boolean
  onConnectionChange: (connected: boolean) => void
  onRefresh?: () => void
  onPromoteBot?: () => void
}

export function WhatsAppStatus({ isConnected, onConnectionChange, onRefresh, onPromoteBot }: WhatsAppStatusProps) {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientInfo, setClientInfo] = useState<any>(null)
  const { toast } = useToast()

  const checkStatus = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/api/whatsapp/status`)
      const data = await response.json()

      onConnectionChange(data.isReady)
      setClientInfo(data.clientInfo)

      if (data.isReady) {
        setQrCode(null)
        toast({
          title: "WhatsApp Connected",
          description: "Successfully connected to WhatsApp Web",
        })
      } else {
        // If not connected, try to get QR code
        await fetchQrCode()
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error)
      setError('Failed to check WhatsApp status')
      onConnectionChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchQrCode = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/qr`)
      const data = await response.json()

      if (data.hasQr && data.qrDataUrl) {
        setQrCode(data.qrDataUrl)
        setError(null)
      } else {
        setQrCode(null)
        setError(data.message || "WhatsApp not connected. Please scan QR code.")
      }
    } catch (error) {
      console.error('Error fetching QR code:', error)
      setQrCode(null)
      setError('Failed to fetch QR code')
    }
  }

  const handleRefresh = () => {
    setQrCode(null)
    setError(null)
    checkStatus()
    if (onRefresh) {
      onRefresh()
    }
  }

  useEffect(() => {
    checkStatus()
  }, [])

  return (
    <Card className="bg-neutral-900 border-neutral-700 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-white text-sm sm:text-base">
          <Smartphone className="h-4 w-4 sm:h-5 sm:w-5" />
          WhatsApp Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-2 sm:p-3 bg-neutral-800 rounded-lg">
          <div className="flex items-center gap-2 sm:gap-3">
            {isConnected ? (
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
            ) : (
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
            )}
            <div>
              <p className="font-medium text-white text-sm">
                {isConnected ? 'Connected' : 'Disconnected'}
              </p>
              <p className="text-xs text-gray-400 hidden sm:block">
                {isConnected ? 'WhatsApp Web is ready' : 'WhatsApp Web not connected'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="border-neutral-600 hover:bg-neutral-700 h-8 w-8 p-0"
          >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {isLoading ? (
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-yellow-400">
              <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
              <span className="text-sm font-medium">Checking...</span>
            </div>
            <p className="text-xs text-gray-400 hidden sm:block">Please wait while we check your WhatsApp status</p>
          </div>
        ) : isConnected ? (
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-[#05c997]">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm font-medium">Connected</span>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-400 hidden sm:block">WhatsApp Web is ready</p>
              {clientInfo && (
                <div className="text-xs text-gray-500 bg-neutral-800 p-1 rounded hidden lg:block">
                  <p>Phone: {clientInfo.wid?.user || 'Unknown'}</p>
                </div>
              )}
            </div>
            {onPromoteBot && (
              <Button
                onClick={onPromoteBot}
                variant="outline"
                size="sm"
                className="border-green-600 hover:bg-green-700 bg-transparent text-green-400 hover:text-white text-xs h-7 w-full mt-2"
              >
                Make Bot Admin
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-red-400">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm font-medium">Not Connected</span>
            </div>

            {/* QR Code Display */}
            {qrCode ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">Scan QR code with WhatsApp:</p>
                <div className="flex justify-center">
                  <img
                    src={qrCode}
                    alt="WhatsApp QR Code"
                    className="w-32 h-32 sm:w-40 sm:h-40 border border-neutral-600 rounded-lg bg-white p-2"
                  />
                </div>
                <div className="text-xs text-gray-500 bg-neutral-800 p-2 rounded text-left">
                  <p className="font-medium mb-1">How to scan:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-xs">
                    <li>Open WhatsApp on your phone</li>
                    <li>Go to Settings → Linked Devices</li>
                    <li>Tap "Link a Device"</li>
                    <li>Scan this QR code</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-gray-400">
                  {error || "WhatsApp is not connected"}
                </p>
                <div className="text-xs text-gray-500 bg-neutral-800 p-2 rounded text-left hidden sm:block">
                  <p className="font-medium mb-1">To connect:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-xs">
                    <li>Start backend server</li>
                    <li>Wait for QR code to appear</li>
                    <li>Use WhatsApp → Linked Devices</li>
                  </ol>
                </div>
              </div>
            )}

            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="border-neutral-700 hover:bg-neutral-800 bg-transparent text-xs h-7 text-white"
            >
              <RefreshCw className="h-3 w-3 mr-1 " />
              {qrCode ? 'Refresh QR' : 'Check Again'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
