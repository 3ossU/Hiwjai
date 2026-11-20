import { useState } from 'react'
import { Routes, Route, Navigate, useNavigate, Outlet } from 'react-router-dom'
import Login from './pages/Login'
import { store } from './api'

// patient
import PatientLayout from './pages/patient/PatientLayout'
import PatientHome from './pages/patient/Home'
import Booking from './pages/patient/Booking'
import Records from './pages/patient/Records'
import PatientHomeVisit from './pages/patient/HomeVisit'
import Activities from './pages/patient/Activities'
import Chat from './pages/patient/Chat'

// nurse
import Layout from './pages/nurse/Layout'
import Dashboard from './pages/nurse/Dashboard'
import HomeVisit from './pages/nurse/HomeVisit'
import Leave from './pages/nurse/Leave'
import NurseBooking from './pages/nurse/Booking'
import PatientInfos from './pages/nurse/PatientInfos'
import AddUser from './pages/nurse/AddUser'
import ApproveLeave from './pages/nurse/ApproveLeave'

// admin
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/Dashboard'
import Accounts from './pages/admin/Accounts'
import Counselors from './pages/admin/Counselors'
import Security from './pages/admin/Security'
import AdminActivities from './pages/admin/Activities';

// cashier
import CashierLayout from './pages/cashier/CashierLayout'
import CashierBilling from './pages/cashier/Billing'
import CashierPayment from './pages/cashier/Payment'
import CashierFinance from './pages/cashier/Finance'

const isNurse = (u) => u?.role === 'nurse' || u?.role === 'head_nurse'
const isAdmin = (u) => u?.role === 'admin'
const isCashier = (u) => u?.role === 'cashier'

// หน้าแรกของแต่ละ role
const homeOf = (u) =>
  isAdmin(u) ? '/admin/dashboard'
  : isNurse(u) ? '/nurse/dashboard'
  : isCashier(u) ? '/cashier/billing'
  : '/patient/home'

const CashierRoute = () => {
  const user = store.user()

  if (!user) return <Navigate to="/login" replace />
  if (!isCashier(user)) return <Navigate to={homeOf(user)} replace />

  return <Outlet />
}

const AdminRoute = () => {
  const user = store.user()

  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin(user)) return <Navigate to={homeOf(user)} replace />

  return <Outlet />
}

const NurseRoute = () => {
  const user = store.user()

  if (!user) return <Navigate to="/login" replace />
  if (!isNurse(user)) return <Navigate to={homeOf(user)} replace />

  return <Outlet />
}

const PatientRoute = () => {
  const user = store.user()

  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'patient') {
    return <Navigate to={isNurse(user) || isAdmin(user) || isCashier(user) ? homeOf(user) : '/login'} replace />
  }

  return <Outlet />
}

function App() {
  const [user, setUser] = useState(() => store.user())
  const navigate = useNavigate()

  const handleLogin = (u) => {
    setUser(u)
    navigate(homeOf(u), { replace: true })
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to={user ? homeOf(user) : '/login'}
            replace
          />
        }
      />

      <Route path="/login" element={<Login onLogin={handleLogin} />} />

      {/* patient */}
      <Route element={<PatientRoute />}>
        <Route path="/patient" element={<PatientLayout />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<PatientHome user={user} />} />
          <Route path="booking" element={<Booking />} />
          <Route path="records" element={<Records />} />
          <Route path="homevisit" element={<PatientHomeVisit />} />
          <Route path="activities" element={<Activities />} />
          <Route path="chat" element={<Chat user={user} />} />
        </Route>
      </Route>

      {/* nurse */}
      <Route element={<NurseRoute />}>
        <Route path="/nurse" element={<Layout user={user} />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard user={user} />} />
          <Route path="homevisit" element={<HomeVisit user={user} />} />
          <Route path="leave" element={<Leave user={user} />} />
          <Route path="booking" element={<NurseBooking user={user} />} />
          <Route path="patientinfos" element={<PatientInfos user={user} />} />
          <Route path="adduser" element={<AddUser user={user} />} />
          <Route path="approveleave" element={<ApproveLeave user={user} />} />
        </Route>
      </Route>

      {/* admin */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminLayout user={user} />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="counselors" element={<Counselors />} />
          <Route path="security" element={<Security />} />
          <Route path="activities" element={<AdminActivities />} />
        </Route>
      </Route>

      {/* cashier */}
      <Route element={<CashierRoute />}>
        <Route path="/cashier" element={<CashierLayout user={user} />}>
          <Route index element={<Navigate to="billing" replace />} />
          <Route path="billing" element={<CashierBilling />} />
          <Route path="payment" element={<CashierPayment />} />
          <Route path="finance" element={<CashierFinance />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App