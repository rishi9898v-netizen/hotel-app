import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helpers
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// Profile helpers
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

// Room helpers
export async function getRooms() {
  const { data, error } = await supabase
    .from('rooms')
    .select(`*, assigned_profile:profiles(id, full_name, avatar_initial)`)
    .order('floor', { ascending: true })
    .order('room_number', { ascending: true })
  return { data, error }
}

export async function updateRoom(roomId, updates) {
  const { data, error } = await supabase
    .from('rooms')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', roomId)
    .select()
    .single()
  return { data, error }
}

export async function createMaintenanceTicket(roomId, note, createdBy) {
  const { data, error } = await supabase
    .from('maintenance_tickets')
    .insert({ room_id: roomId, note, created_by: createdBy, status: 'open' })
    .select()
    .single()
  return { data, error }
}

export async function getMaintenanceTickets(roomId) {
  const { data, error } = await supabase
    .from('maintenance_tickets')
    .select(`*, creator:profiles(full_name)`)
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function resolveTicket(ticketId) {
  const { data, error } = await supabase
    .from('maintenance_tickets')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', ticketId)
    .select()
    .single()
  return { data, error }
}

export async function getProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name')
  return { data, error }
}

export async function getActivityLog(limit = 50) {
  const { data, error } = await supabase
    .from('activity_log')
    .select(`*, actor:profiles(full_name)`)
    .order('created_at', { ascending: false })
    .limit(limit)
  return { data, error }
}

export async function logActivity(roomId, action, actorId, metadata = {}) {
  await supabase.from('activity_log').insert({
    room_id: roomId,
    action,
    actor_id: actorId,
    metadata
  })
}

// Hotel config
export async function getHotelConfig() {
  const { data, error } = await supabase
    .from('hotel_config')
    .select('*')
    .single()
  return { data, error }
}

export async function updateHotelConfig(config) {
  const { data, error } = await supabase
    .from('hotel_config')
    .upsert({ id: 1, ...config })
    .select()
    .single()
  return { data, error }
}

// Admin: create employee account
export async function inviteEmployee({ email, fullName, role, floors }) {
  // Uses Supabase admin signup - the user will get a magic link
  const { data, error } = await supabase.auth.signUp({
    email,
    password: Math.random().toString(36).slice(-10) + 'Aa1!', // temp password
    options: {
      data: { full_name: fullName, role, floors }
    }
  })
  return { data, error }
}
