import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout, PlainLayout } from '@/components/AppLayout'
import { CurrentUserProvider } from '@/components/CurrentUser'
import { ToastProvider } from '@/components/Toast'
import { FeedScreen } from '@/screens/FeedScreen'
import { MapScreen } from '@/screens/MapScreen'
import { ListingScreen } from '@/screens/ListingScreen'
import { NewListingScreen } from '@/screens/NewListingScreen'
import { ChatsScreen } from '@/screens/ChatsScreen'
import { ChatScreen } from '@/screens/ChatScreen'
import { ProfileScreen } from '@/screens/ProfileScreen'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ToastProvider>
        <CurrentUserProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<FeedScreen />} />
              <Route path="/map" element={<MapScreen />} />
              <Route path="/chats" element={<ChatsScreen />} />
              <Route path="/profile" element={<ProfileScreen />} />
            </Route>
            <Route element={<PlainLayout />}>
              <Route path="/listing/:id" element={<ListingScreen />} />
              <Route path="/new" element={<NewListingScreen />} />
              <Route path="/chats/:id" element={<ChatScreen />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CurrentUserProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
