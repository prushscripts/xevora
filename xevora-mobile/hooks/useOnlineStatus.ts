import { useEffect, useState } from 'react'
import NetInfo from '@react-native-community/netinfo'

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      const connected = state.isConnected === true
      const reachable = state.isInternetReachable
      if (!connected) {
        setOnline(false)
        return
      }
      if (reachable === false) {
        setOnline(false)
        return
      }
      setOnline(true)
    })
    return () => sub()
  }, [])

  return online
}
