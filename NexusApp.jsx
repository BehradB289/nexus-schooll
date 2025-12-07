import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Calendar, BarChart3, Settings, LogOut, Plus, Trash2, 
  MessageSquare, Image as ImageIcon, Send, Shield, Zap, 
  Cpu, Heart, Brain, Mic, FileText, Bell, Key, Layers, 
  Clock, Monitor, Search, Award, Save, X, Edit3, AlertTriangle,
  BookOpen, TrendingUp, TrendingDown, Target, Activity, Coffee, Sparkles,
  HelpCircle, CheckCircle, XCircle
} from 'lucide-react';

// --- 1. ایمپورت‌های فایربیس ---
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, getDocs, 
  query, where, deleteDoc, doc, updateDoc 
} from "firebase/firestore";

/**
 * ====================================================================
 * 
 * ====================================================================
 */
const firebaseConfig = {
  apiKey: "AIzaSyDHHm6ia7QRoICpgSrboYCRahhNml-6CYg",
  authDomain: "nexus-school-4510d.firebaseapp.com",
  projectId: "nexus-school-4510d",
  storageBucket: "nexus-school-4510d.firebasestorage.app",
  messagingSenderId: "89802734850",
  appId: "1:89802734850:web:0a1d106d080e386eba561b",
  measurementId: "G-12KZ071LRV"
};

// راه‌اندازی فایربیس (با کنترل خطا برای جلوگیری از کرش کردن اگر کانفیگ نبود)
let dbRef = null;
try {
  if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    const app = initializeApp(firebaseConfig);
    dbRef = getFirestore(app);
    console.log("✅ فایربیس متصل شد");
  } else {
    console.log("⚠️ کانفیگ فایربیس وارد نشده است. حالت آفلاین فعال شد.");
  }
} catch (e) {
  console.error("خطا در اتصال فایربیس:", e);
}

/**
 * ====================================================================
 * ثابت‌ها و تنظیمات برنامه (بدون تغییر)
 * ====================================================================
 */
const APP_CONFIG = {
  ADMIN_DEFAULT: {
    username: "BehradB2",
    password: "BehradB289", 
    name: "مدیر ارشد بهراد",
    role: "admin"
  }
};

const SCHOOL_CLASSES = ["دهم تجربی ۱", "دهم تجربی ۲", "دهم ریاضی ۱", "دهم ریاضی ۲"];
const SCHOOL_SUBJECTS = ["ریاضی", "فیزیک", "زیست‌شناسی", "شیمی", "ادبیات فارسی", "دین و زندگی", "عربی", "زبان انگلیسی", "هندسه", "آمار و احتمال"];
const TIME_HOURS = Array.from({length: 16}, (_, i) => (i + 6).toString().padStart(2, '0'));
const TIME_MINUTES = ["00", "15", "30", "45"];
const WEEK_DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];
const SHAMSI_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const SHAMSI_DAYS = Array.from({length: 31}, (_, i) => (i + 1).toString().padStart(2, '0'));
const SHAMSI_YEARS = ["1403", "1404"];

const INITIAL_DATA = {
  users: [{ id: 1, ...APP_CONFIG.ADMIN_DEFAULT }],
  grades: [], schedule: [], exams: [], personalSchedule: [], notes: [], apiKey: "", aiPlans: [] 
};

const AI_PERSONAS = [
  { id: 'tutor', name: 'استاد خصوصی', icon: <Brain className="w-5 h-5"/>, color: 'text-cyan-400', desc: 'رفع اشکال درسی تخصصی', sysPrompt: 'تو یک معلم خصوصی دلسوز هستی.' },
  { id: 'manager', name: 'مدیر برنامه', icon: <Cpu className="w-5 h-5"/>, color: 'text-purple-400', desc: 'مدیریت زمان و استراتژی', sysPrompt: 'تو یک مشاور تحصیلی سخت‌گیر هستی.' },
  { id: 'psych', name: 'همدل (روانشناس)', icon: <Heart className="w-5 h-5"/>, color: 'text-pink-400', desc: 'کاهش استرس و انگیزه', sysPrompt: 'تو یک روانشناس مهربان هستی.' },
];

// --- توابع کمکی ---
const cleanJSON = (text) => text?.replace(/```json/g, '').replace(/```/g, '').trim() || "";

async function callGeminiAPI(apiKey, prompt, systemInstruction) {
  if (!apiKey) return null;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: systemInstruction }] } })
    });
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) { return null; }
}

const TimePicker = ({ value, onChange }) => {
  const [h, m] = value ? value.split(':') : ["08", "00"];
  return (
    <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded p-1">
      <select value={h} onChange={e => onChange(`${e.target.value}:${m}`)} className="bg-transparent text-white outline-none text-center appearance-none">{TIME_HOURS.map(hour => <option key={hour} value={hour}>{hour}</option>)}</select>
      <span className="text-slate-500">:</span>
      <select value={m} onChange={e => onChange(`${h}:${e.target.value}`)} className="bg-transparent text-white outline-none text-center appearance-none">{TIME_MINUTES.map(min => <option key={min} value={min}>{min}</option>)}</select>
    </div>
  );
};

const DatePicker = ({ value, onChange }) => {
  const parts = value ? value.split('/') : ["1403", "01", "01"];
  const [y, mIndex, d] = [parts[0], parseInt(parts[1]) - 1, parts[2]];
  const updateDate = (newY, newM, newD) => { const mStr = (newM + 1).toString().padStart(2, '0'); onChange(`${newY}/${mStr}/${newD}`); };
  return (
    <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded p-1 w-full">
      <select value={d} onChange={e => updateDate(y, mIndex, e.target.value)} className="bg-transparent text-white outline-none flex-1 text-center text-xs appearance-none">{SHAMSI_DAYS.map(day => <option key={day} value={day}>{day}</option>)}</select>
      <span className="text-slate-600">/</span>
      <select value={mIndex} onChange={e => updateDate(y, parseInt(e.target.value), d)} className="bg-transparent text-white outline-none flex-1 text-center text-xs appearance-none">{SHAMSI_MONTHS.map((month, idx) => <option key={idx} value={idx}>{month}</option>)}</select>
      <span className="text-slate-600">/</span>
      <select value={y} onChange={e => updateDate(e.target.value, mIndex, d)} className="bg-transparent text-white outline-none flex-1 text-center text-xs appearance-none">{SHAMSI_YEARS.map(year => <option key={year} value={year}>{year}</option>)}</select>
    </div>
  );
};

const getDaysDiff = (dateStr) => Math.floor(Math.random() * 10) + 1;

/**
 * ====================================================================
 * کامپوننت اصلی (NexusApp)
 * ====================================================================
 */
export default function NexusApp() {
  const [user, setUser] = useState(null);
  const [db, setDb] = useState(INITIAL_DATA);
  const [loading, setLoading] = useState(true);

  // --- سیستم لود دیتا (ترکیبی: فایربیس + لوکال) ---
  useEffect(() => {
    const loadData = async () => {
      // اگر فایربیس وصل بود، از آنجا بخوان
      if (dbRef) {
        try {
          const [usersSnap, gradesSnap, scheduleSnap, examsSnap, personalSnap, plansSnap] = await Promise.all([
            getDocs(collection(dbRef, "users")),
            getDocs(collection(dbRef, "grades")),
            getDocs(collection(dbRef, "schedule")),
            getDocs(collection(dbRef, "exams")),
            getDocs(collection(dbRef, "personalSchedule")),
            getDocs(collection(dbRef, "aiPlans"))
          ]);
          
          const format = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));
          
          // ترکیب داده‌های فایربیس با ادمین پیش‌فرض
          const remoteUsers = format(usersSnap);
          const allUsers = remoteUsers.some(u => u.username === "BehradB2") ? remoteUsers : [...remoteUsers, { id: 1, ...APP_CONFIG.ADMIN_DEFAULT }];

          setDb({
            users: allUsers,
            grades: format(gradesSnap),
            schedule: format(scheduleSnap),
            exams: format(examsSnap),
            personalSchedule: format(personalSnap),
            aiPlans: format(plansSnap),
            apiKey: localStorage.getItem("nexus_api_key") || "", // API Key از لوکال خوانده می‌شود (برای امنیت)
            notes: []
          });
        } catch (err) {
          console.error("خطا در خواندن از فایربیس، سوییچ به لوکال", err);
        }
      } else {
        // حالت آفلاین (Local Storage)
        const savedData = localStorage.getItem('nexus_pro_final_db');
        if (savedData) setDb(JSON.parse(savedData));
      }
      setLoading(false);
    };
    loadData();
  }, []);

  // --- سیستم ذخیره دیتا (ترکیبی) ---
  useEffect(() => {
    // همیشه در لوکال ذخیره کن (به عنوان بکاپ)
    localStorage.setItem('nexus_pro_final_db', JSON.stringify(db));
  }, [db]);

  // تابع کمکی برای ذخیره در فایربیس (اگر وصل بود)
  const saveToCloud = async (collectionName, data) => {
    if (dbRef) {
      try {
        const docRef = await addDoc(collection(dbRef, collectionName), data);
        return docRef.id; // برگرداندن آیدی واقعی فایربیس
      } catch (e) {
        console.error("Cloud Save Error:", e);
      }
    }
    return Date.now(); // آیدی موقت برای حالت آفلاین
  };

  const deleteFromCloud = async (collectionName, id) => {
    if (dbRef) {
      try {
        await deleteDoc(doc(dbRef, collectionName, String(id)));
      } catch (e) { console.error("Cloud Delete Error:", e); }
    }
  };

  const handleLogin = (username, password) => {
    const foundUser = db.users.find(u => u.username === username && u.password === password);
    if (foundUser) {
      setUser(foundUser);
      return { success: true };
    }
    return { success: false, message: "اطلاعات ورود نامعتبر است." };
  };

  const handleLogout = () => setUser(null);

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-950 text-cyan-500">در حال بارگذاری سیستم نکسوس...</div>;

  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500 selection:text-white" dir="rtl">
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-cyan-500/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-cyan-400" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">نکسوس</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                {dbRef ? "وضعیت: آنلاین (Firebase)" : "وضعیت: آفلاین (Local)"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-left hidden sm:block">
              <p className="font-semibold text-sm text-slate-200">{user.name}</p>
              <span className="text-[10px] bg-cyan-900/50 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30">
                {user.role === 'admin' ? 'مدیر کل' : `${user.classLevel} - ${user.branch}`}
              </span>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        {user.role === 'admin' ? (
          <AdminDashboard db={db} setDb={setDb} saveToCloud={saveToCloud} deleteFromCloud={deleteFromCloud} />
        ) : (
          <StudentDashboard db={db} setDb={setDb} saveToCloud={saveToCloud} currentUser={user} setUser={setUser} />
        )}
      </main>
    </div>
  );
}

// ... LoginPage ...
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden" dir="rtl">
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-8 rounded-2xl w-full max-w-md shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <Shield className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white">ورود به نکسوس</h2>
        </div>
        {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        <form onSubmit={(e) => { e.preventDefault(); const res = onLogin(username, password); if(!res.success) setError(res.message); }} className="space-y-4">
          <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white" placeholder="نام کاربری" value={username} onChange={e => setUsername(e.target.value)} />
          <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white" type="password" placeholder="رمز عبور" value={password} onChange={e => setPassword(e.target.value)} />
          <button className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg mt-4">ورود</button>
        </form>
      </div>
    </div>
  );
}

// ... Admin Dashboard ...
function AdminDashboard({ db, setDb, saveToCloud, deleteFromCloud }) {
  const [activeTab, setActiveTab] = useState('users');
  const tabs = [
    { id: 'users', label: 'مدیریت کاربران', icon: <User/> },
    { id: 'schedule', label: 'برنامه کلاسی رسمی', icon: <Calendar/> },
    { id: 'exams', label: 'برنامه امتحانات', icon: <Clock/> },
    { id: 'grades', label: 'ثبت نمرات', icon: <BarChart3/> },
    { id: 'ai_manager', label: 'هوش مصنوعی ناظر', icon: <Activity/> },
    { id: 'api', label: 'تنظیمات API', icon: <Key/> },
  ];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-1 space-y-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all border ${activeTab === tab.id ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-slate-800/30 border-transparent text-slate-400 hover:bg-slate-800'}`}>
            {tab.icon} <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="lg:col-span-4 bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 min-h-[600px]">
        {activeTab === 'users' && <AdminUserManagement db={db} setDb={setDb} saveToCloud={saveToCloud} deleteFromCloud={deleteFromCloud} />}
        {activeTab === 'schedule' && <AdminScheduleManager db={db} setDb={setDb} saveToCloud={saveToCloud} deleteFromCloud={deleteFromCloud} />}
        {activeTab === 'exams' && <AdminExamManager db={db} setDb={setDb} saveToCloud={saveToCloud} deleteFromCloud={deleteFromCloud} />}
        {activeTab === 'grades' && <AdminGradeManager db={db} setDb={setDb} saveToCloud={saveToCloud} />}
        {activeTab === 'ai_manager' && <AdminAIManager db={db} />}
        {activeTab === 'api' && <AdminAPISettings db={db} setDb={setDb} />}
      </div>
    </div>
  );
}

function AdminUserManagement({ db, setDb, saveToCloud, deleteFromCloud }) {
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', classLevel: SCHOOL_CLASSES[0], branch: 'شعبه ۱' });
  const handleAdd = async () => {
    if (!newUser.username) return alert("نام کاربری الزامی است");
    if (db.users.some(u => u.username === newUser.username)) return alert("نام کاربری تکراری است");
    const userObj = { role: 'student', xp: 0, branch: newUser.classLevel, ...newUser };
    const id = await saveToCloud("users", userObj);
    setDb({ ...db, users: [...db.users, { id, ...userObj }] });
    setNewUser({ ...newUser, name: '', username: '', password: '' });
  };
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-cyan-400">تعریف دانش‌آموز جدید</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
        <input placeholder="نام کامل" className="bg-slate-900 border border-slate-700 rounded p-2 text-white" value={newUser.name} onChange={e=>setNewUser({...newUser, name: e.target.value})} />
        <input placeholder="نام کاربری" dir="ltr" className="bg-slate-900 border border-slate-700 rounded p-2 text-white" value={newUser.username} onChange={e=>setNewUser({...newUser, username: e.target.value})} />
        <input placeholder="رمز عبور" dir="ltr" className="bg-slate-900 border border-slate-700 rounded p-2 text-white" value={newUser.password} onChange={e=>setNewUser({...newUser, password: e.target.value})} />
        <select className="bg-slate-900 border border-slate-700 rounded p-2 text-white" value={newUser.classLevel} onChange={e=>setNewUser({...newUser, classLevel: e.target.value})}>
          {SCHOOL_CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)}
        </select>
        <button onClick={handleAdd} className="bg-cyan-600 hover:bg-cyan-500 text-white rounded p-2 flex justify-center items-center gap-2 lg:col-span-4">افزودن</button>
      </div>
      <table className="w-full text-right text-sm mt-4">
        <thead className="text-slate-500 border-b border-slate-700"><tr><th className="p-3">نام</th><th className="p-3">کلاس/شعبه</th><th className="p-3">عملیات</th></tr></thead>
        <tbody>
          {db.users.filter(u => u.role === 'student').map(u => (
            <tr key={u.id} className="border-b border-slate-800 text-slate-300">
              <td className="p-3">{u.name}</td>
              <td className="p-3 text-cyan-400">{u.classLevel}</td>
              <td className="p-3"><button onClick={async () => { await deleteFromCloud("users", u.id); setDb({...db, users: db.users.filter(x => x.id !== u.id)}); }} className="text-red-400"><Trash2 className="w-4 h-4"/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminScheduleManager({ db, setDb, saveToCloud, deleteFromCloud }) {
  const [entry, setEntry] = useState({ classLevel: SCHOOL_CLASSES[0], day: 'شنبه', time: '08:00', subject: SCHOOL_SUBJECTS[0] });
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-purple-400">برنامه هفتگی رسمی</h3>
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 grid gap-4 grid-cols-1 md:grid-cols-5 items-end">
        <div className="flex flex-col gap-1"> <label className="text-xs text-slate-400">کلاس</label> <select className="bg-slate-900 border border-slate-700 rounded p-2 text-white" value={entry.classLevel} onChange={e=>setEntry({...entry, classLevel: e.target.value})}> {SCHOOL_CLASSES.map(c=><option key={c} value={c}>{c}</option>)} </select> </div>
        <div className="flex flex-col gap-1"> <label className="text-xs text-slate-400">روز هفته</label> <select className="bg-slate-900 border border-slate-700 rounded p-2 text-white" value={entry.day} onChange={e=>setEntry({...entry, day: e.target.value})}> {WEEK_DAYS.map(d=><option key={d}>{d}</option>)} </select> </div>
        <div className="flex flex-col gap-1"> <label className="text-xs text-slate-400">ساعت شروع</label> <TimePicker value={entry.time} onChange={(val) => setEntry({...entry, time: val})} /> </div>
        <div className="flex flex-col gap-1"> <label className="text-xs text-slate-400">درس</label> <select className="bg-slate-900 border border-slate-700 rounded p-2 text-white" value={entry.subject} onChange={e=>setEntry({...entry, subject: e.target.value})}> {SCHOOL_SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)} </select> </div>
        <button onClick={async ()=>{ const id=await saveToCloud("schedule", entry); setDb({...db, schedule: [...db.schedule, { id, ...entry }]})}} className="bg-purple-600 text-white rounded p-2 h-10">ذخیره</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {db.schedule.map(s => (
          <div key={s.id} className="bg-slate-800 p-3 rounded border border-slate-700 flex justify-between">
            <span className="text-slate-200">{s.classLevel} | {s.day} : {s.subject} ({s.time})</span>
            <button onClick={async ()=>{ await deleteFromCloud("schedule", s.id); setDb({...db, schedule: db.schedule.filter(x=>x.id!==s.id)})}} className="text-red-400"><Trash2 className="w-4 h-4"/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminExamManager({ db, setDb, saveToCloud, deleteFromCloud }) {
  const [exam, setExam] = useState({ title: SCHOOL_SUBJECTS[0], date: '1403/03/20', classLevel: SCHOOL_CLASSES[0] });
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-yellow-400">برنامه امتحانات</h3>
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1 flex-1 min-w-[150px]"> <label className="text-xs text-slate-400">درس امتحان</label> <select className="bg-slate-900 border border-slate-700 rounded p-2 text-white w-full" value={exam.title} onChange={e=>setExam({...exam, title: e.target.value})}> {SCHOOL_SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)} </select> </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]"> <label className="text-xs text-slate-400">تاریخ برگزاری</label> <DatePicker value={exam.date} onChange={val => setExam({...exam, date: val})} /> </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[150px]"> <label className="text-xs text-slate-400">کلاس</label> <select className="bg-slate-900 border border-slate-700 rounded p-2 text-white w-full" value={exam.classLevel} onChange={e=>setExam({...exam, classLevel: e.target.value})}> {SCHOOL_CLASSES.map(c=><option key={c} value={c}>{c}</option>)} </select> </div>
        <button onClick={async ()=>{ const id=await saveToCloud("exams", exam); setDb({...db, exams: [...db.exams, {id, ...exam}]}); }} className="bg-yellow-600 text-white px-4 rounded hover:bg-yellow-500 h-10">ثبت</button>
      </div>
      <div className="space-y-2">
        {db.exams.map(e => (
          <div key={e.id} className="flex justify-between p-3 bg-slate-800 rounded border-l-4 border-yellow-500">
             <span className="text-white">امتحان {e.title} ({e.classLevel})</span>
             <div className="flex gap-4"> <span className="text-slate-400">{e.date}</span> <button onClick={async ()=>{ await deleteFromCloud("exams", e.id); setDb({...db, exams: db.exams.filter(x=>x.id!==e.id)})}} className="text-red-400"><Trash2 className="w-4 h-4"/></button> </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminAIManager({ db }) {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const generateReport = async () => {
      setLoading(true);
      const studentCount = db.users.filter(u => u.role === 'student').length;
      const allGrades = db.grades.map(g => ({ subject: g.subject, score: g.score }));
      const failingGrades = allGrades.filter(g => g.score < 12).length;
      const avg = allGrades.length ? (allGrades.reduce((a, b) => a + b.score, 0) / allGrades.length).toFixed(2) : 0;
      const promptData = `اطلاعات مدرسه: تعداد دانش‌آموز: ${studentCount}، میانگین کل نمرات: ${avg}، تعداد نمرات مردودی: ${failingGrades}`;
      if (db.apiKey) {
        const response = await callGeminiAPI(db.apiKey, `یک گزارش تحلیلی و مدیریتی برای مدیر مدرسه بنویس.`, `تو مشاور آموزشی هستی. داده‌ها: ${promptData}`);
        if (response) { setReport(response); setLoading(false); return; }
      }
      setTimeout(() => { setReport(`[گزارش شبیه‌سازی شده]\n• میانگین نمرات کل: ${avg}\n• وضعیت بحرانی: ${failingGrades} مورد.\n• برای تحلیل هوشمند، API Key وارد کنید.`); setLoading(false); }, 1500);
    };
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-teal-400 flex items-center gap-2"><Activity/> هوش مصنوعی ناظر (Gemini)</h3>
        <button onClick={generateReport} disabled={loading} className="bg-teal-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-teal-500 transition-all"> {loading ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div> : <Sparkles className="w-5 h-5"/>} تولید گزارش هوشمند </button>
        {report && <div className="bg-slate-800 p-6 rounded-xl border border-teal-500/30 mt-4 animate-fade-in"><pre className="whitespace-pre-wrap font-sans text-slate-200 leading-relaxed">{report}</pre></div>}
      </div>
    );
}

function AdminAPISettings({ db, setDb }) {
    // API Key در دیتابیس عمومی ذخیره نمی‌شود، فقط در لوکال
    const [key, setKey] = useState(db.apiKey);
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-red-400 flex items-center gap-2"><Key/> تنظیمات API</h3>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
          <div>
            <label className="block text-slate-300 mb-2">Google Gemini API Key</label>
            <div className="flex gap-2">
              <input type="password" className="flex-1 bg-slate-950 border border-slate-600 rounded px-4 py-2 text-white font-mono" value={key || ''} onChange={(e) => setKey(e.target.value)} placeholder="AIzaSy..." />
              <button onClick={() => { localStorage.setItem("nexus_api_key", key); setDb({...db, apiKey: key}); alert("کلید API در مرورگر شما ذخیره شد."); }} className="bg-cyan-600 text-white px-6 rounded hover:bg-cyan-500">ذخیره</button>
            </div>
          </div>
        </div>
      </div>
    );
}

function AdminGradeManager({ db, setDb, saveToCloud }) {
    const [data, setData] = useState({ username: '', subject: SCHOOL_SUBJECTS[0], score: '' });
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-green-400">ثبت نمرات</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-slate-800/50 p-4 rounded-xl">
          <select className="bg-slate-900 text-white p-2 rounded" onChange={e=>setData({...data, username: e.target.value})}> <option value="">انتخاب دانش آموز...</option> {db.users.filter(u=>u.role==='student').map(u=><option key={u.username} value={u.username}>{u.name}</option>)} </select>
          <select className="bg-slate-900 text-white p-2 rounded" value={data.subject} onChange={e=>setData({...data, subject: e.target.value})}> {SCHOOL_SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)} </select>
          <input type="number" placeholder="نمره" className="bg-slate-900 text-white p-2 rounded" value={data.score} onChange={e=>setData({...data, score: e.target.value})} />
          <button onClick={async ()=>{ if(data.username && data.score) { const gradeObj = {studentUsername: data.username, subject: data.subject, score: Number(data.score), date: new Date().toLocaleDateString('fa-IR') }; const id = await saveToCloud("grades", gradeObj); setDb({...db, grades: [...db.grades, {id, ...gradeObj}]}); alert('ثبت شد'); setData({...data, score: ''}); } }} className="bg-green-600 text-white rounded">ثبت</button>
        </div>
      </div>
    );
}

/**
 * ====================================================================
 * پنل دانش‌آموز (Student Dashboard)
 * ====================================================================
 */
function StudentDashboard({ db, setDb, currentUser, setUser, saveToCloud }) {
  const [activeTab, setActiveTab] = useState('study_plan');
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-cyan-500/20 text-center">
          <User className="w-10 h-10 text-cyan-400 mx-auto mb-2"/>
          <h3 className="font-bold text-white">{currentUser.name}</h3>
          <p className="text-slate-400 text-xs mt-1">{currentUser.classLevel}</p>
        </div>
        <nav className="space-y-2">
          {[ { id: 'study_plan', label: 'برنامه‌ریز هوشمند', icon: <Target/>, color: 'text-orange-400' }, { id: 'smart_quiz', label: 'آزمون‌ساز هوشمند', icon: <HelpCircle/>, color: 'text-teal-400' }, { id: 'schedule', label: 'برنامه هفتگی', icon: <Calendar/>, color: 'text-purple-400' }, { id: 'analytics', label: 'تحلیل نمرات', icon: <BarChart3/>, color: 'text-blue-400' }, { id: 'ai', label: 'چت با هوش مصنوعی', icon: <Sparkles/>, color: 'text-cyan-400' }, { id: 'exams', label: 'امتحانات', icon: <Clock/>, color: 'text-yellow-400' } ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-slate-800 text-white border-r-4 border-cyan-500' : 'text-slate-400 hover:bg-slate-800/50'}`}> <div className={`${item.color}`}>{item.icon}</div> <span>{item.label}</span> </button>
          ))}
        </nav>
      </div>
      <div className="lg:col-span-9 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl min-h-[600px] p-6">
        {activeTab === 'study_plan' && <AIStudyPlanner currentUser={currentUser} db={db} setDb={setDb} saveToCloud={saveToCloud} />}
        {activeTab === 'smart_quiz' && <StudentSmartQuiz currentUser={currentUser} db={db} />} 
        {activeTab === 'analytics' && <StudentAnalytics currentUser={currentUser} db={db} />}
        {activeTab === 'ai' && <StudentAIChat currentUser={currentUser} db={db} setDb={setDb} setUser={setUser} />}
        {activeTab === 'schedule' && <StudentClassSchedule currentUser={currentUser} db={db} setDb={setDb} saveToCloud={saveToCloud} />}
        {activeTab === 'exams' && <StudentExamSection currentUser={currentUser} db={db} />}
      </div>
    </div>
  );
}

function AIStudyPlanner({ currentUser, db, setDb, saveToCloud }) {
  const [generating, setGenerating] = useState(false);
  const myPlan = db.aiPlans.find(p => p.studentUsername === currentUser.username);

  const generatePlan = async () => {
    setGenerating(true);
    const myGrades = db.grades.filter(g => g.studentUsername === currentUser.username);
    const myPersonalEvents = db.personalSchedule.filter(s => s.studentUsername === currentUser.username);
    const myExams = db.exams.filter(e => e.classLevel === currentUser.classLevel);

    if (db.apiKey) {
      const promptContext = JSON.stringify({ grades: myGrades.map(g => ({subject: g.subject, score: g.score})), exams: myExams.map(e => ({subject: e.title, date: e.date})), busy_times: myPersonalEvents.map(p => ({day: p.day, time: p.time})) });
      const prompt = `یک برنامه مطالعاتی هفتگی دقیق بساز. خروجی فقط JSON باشد: [{ "day": "شنبه", "blocks": [{ "time": "...", "task": "...", "type": "study" }] }]`;
      const response = await callGeminiAPI(db.apiKey, prompt, `مشاور تحصیلی هوشمند. داده‌ها: ${promptContext}`);
      
      if (response) {
        try {
          const newSchedule = JSON.parse(cleanJSON(response));
          const planData = { studentUsername: currentUser.username, schedule: newSchedule, dateCreated: new Date().toLocaleDateString('fa-IR') };
          const id = await saveToCloud("aiPlans", planData);
          setDb({ ...db, aiPlans: [...db.aiPlans.filter(p => p.studentUsername !== currentUser.username), { id, ...planData }] });
          setGenerating(false);
          return;
        } catch (e) { console.error("JSON Error"); }
      }
    }
    // Fallback Algorithm
    setTimeout(async () => {
       // ... (Simple Algorithm Logic for backup) ...
       const newSchedule = WEEK_DAYS.map(day => ({ day, blocks: [{ time: "16:00 - 18:00", task: "مطالعه آزاد (الگوریتم آفلاین)", type: "study" }] }));
       const planData = { studentUsername: currentUser.username, schedule: newSchedule, dateCreated: new Date().toLocaleDateString('fa-IR') };
       const id = await saveToCloud("aiPlans", planData);
       setDb({ ...db, aiPlans: [...db.aiPlans.filter(p => p.studentUsername !== currentUser.username), { id, ...planData }] });
       setGenerating(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-700 pb-4">
        <div><h3 className="text-xl font-bold text-orange-400 flex items-center gap-2"><Target/> برنامه‌ریز هوشمند نکسوس</h3><p className="text-slate-400 text-sm mt-1">تولید برنامه درسی شخصی‌سازی شده با Gemini.</p></div>
        <button onClick={generatePlan} disabled={generating} className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-2 rounded-xl flex items-center gap-2"> {generating ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div> : <Cpu className="w-5 h-5"/>} {myPlan ? 'تولید مجدد' : 'ساخت برنامه'} </button>
      </div>
      {myPlan ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {myPlan.schedule.map((dayPlan, idx) => (
            <div key={idx} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h4 className="text-center font-bold text-orange-400 border-b border-slate-700 pb-2 mb-3">{dayPlan.day}</h4>
              <div className="space-y-2">
                {dayPlan.blocks.map((block, bIdx) => (
                  <div key={bIdx} className="p-3 rounded border text-sm bg-slate-900/50 border-slate-700/50 text-slate-200">
                    <span className="text-xs opacity-70 font-mono mb-1">{block.time}</span><span className="font-medium block">{block.task}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : !generating && <div className="text-center text-slate-500 py-10">هنوز برنامه‌ای ساخته نشده است.</div>}
    </div>
  );
}

function StudentSmartQuiz({ currentUser, db }) {
  const [subject, setSubject] = useState(SCHOOL_SUBJECTS[0]);
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const generateQuiz = async () => {
    if (!db.apiKey) return alert("برای ساخت آزمون، API Key نیاز است.");
    setLoading(true); setQuiz(null); setResult(null); setAnswers({});
    const prompt = `سه سوال تستی چهارگزینه‌ای از درس "${subject}" طراحی کن. خروجی JSON: [{ "id": 1, "question": "...", "options": ["..."], "correct": 0 }]`;
    const response = await callGeminiAPI(db.apiKey, prompt, "طراح سوال کنکور.");
    if (response) { try { setQuiz(JSON.parse(cleanJSON(response))); } catch (e) { alert("خطا در تولید آزمون"); } }
    setLoading(false);
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-700 pb-4"><div><h3 className="text-xl font-bold text-teal-400 flex items-center gap-2"><HelpCircle/> آزمون‌ساز هوشمند</h3></div></div>
      {!quiz && (<div className="bg-slate-800 p-6 rounded-xl text-center space-y-4 max-w-md mx-auto"><select className="w-full bg-slate-900 p-3 rounded text-white border border-slate-700" value={subject} onChange={e => setSubject(e.target.value)}>{SCHOOL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}</select><button onClick={generateQuiz} disabled={loading} className="w-full bg-teal-600 text-white p-3 rounded-lg font-bold">{loading ? "در حال طراحی..." : "شروع آزمون"}</button></div>)}
      {quiz && !result && result !== 0 && (<div className="space-y-6 animate-fade-in">{quiz.map((q, idx) => (<div key={q.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700"><p className="font-bold text-lg mb-3 text-white">سوال {idx + 1}: {q.question}</p><div className="space-y-2">{q.options.map((opt, optIdx) => (<button key={optIdx} onClick={() => setAnswers({...answers, [q.id]: optIdx})} className={`w-full text-right p-3 rounded border ${answers[q.id] === optIdx ? 'bg-teal-500/20 border-teal-500 text-teal-200' : 'bg-slate-900 border-slate-700'}`}>{opt}</button>))}</div></div>))}<button onClick={() => { let s=0; quiz.forEach(q=>{if(answers[q.id]===q.correct)s++}); setResult(s); }} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold w-full">ثبت پاسخ‌ها</button></div>)}
      {result !== null && (<div className="text-center bg-slate-800 p-8 rounded-2xl border border-teal-500"><h3 className="text-2xl font-bold text-white">نتیجه آزمون</h3><p className="text-4xl font-bold text-teal-400 my-4">{result} / {quiz.length}</p><button onClick={() => {setQuiz(null); setResult(null);}} className="bg-slate-700 text-white px-6 py-2 rounded-lg">آزمون جدید</button></div>)}
    </div>
  );
}

function StudentClassSchedule({ currentUser, db, setDb, saveToCloud }) {
  const schoolSchedule = db.schedule.filter(s => s.classLevel === currentUser.classLevel);
  const myPersonal = db.personalSchedule ? db.personalSchedule.filter(s => s.studentUsername === currentUser.username) : [];
  const [newPersonal, setNewPersonal] = useState({ day: 'شنبه', time: '16:00', title: '' });
  const addPersonal = async () => {
    if (!newPersonal.title) return;
    const item = { studentUsername: currentUser.username, ...newPersonal };
    const id = await saveToCloud("personalSchedule", item);
    setDb({ ...db, personalSchedule: [...(db.personalSchedule || []), { id, ...item }] });
    setNewPersonal({ ...newPersonal, title: '' });
  };
  return (
    <div className="space-y-8">
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <h4 className="text-purple-400 font-bold mb-3 flex items-center gap-2"><Plus className="w-4 h-4"/> افزودن برنامه شخصی</h4>
        <div className="flex gap-2 flex-wrap items-end">
           <div className="flex flex-col gap-1"><select className="bg-slate-900 border border-slate-700 rounded p-2 text-white" value={newPersonal.day} onChange={e=>setNewPersonal({...newPersonal, day: e.target.value})}>{WEEK_DAYS.map(d=><option key={d}>{d}</option>)}</select></div>
           <div className="flex flex-col gap-1"><TimePicker value={newPersonal.time} onChange={val=>setNewPersonal({...newPersonal, time: val})}/></div>
           <div className="flex flex-col gap-1 flex-1"><input className="bg-slate-900 border border-slate-700 rounded p-2 text-white w-full" placeholder="عنوان فعالیت" value={newPersonal.title} onChange={e=>setNewPersonal({...newPersonal, title: e.target.value})}/></div>
           <button onClick={addPersonal} className="bg-purple-600 text-white p-2 rounded h-10 px-4">افزودن</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {WEEK_DAYS.map(day => {
          const daySchool = schoolSchedule.filter(s => s.day === day);
          const dayPersonal = myPersonal.filter(s => s.day === day);
          const allEvents = [...daySchool.map(x => ({...x, type: 'school'})), ...dayPersonal.map(x => ({...x, subject: x.title, type: 'personal'}))].sort((a,b) => a.time.localeCompare(b.time));
          return (
            <div key={day} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 min-h-[150px]">
              <h4 className="text-center font-bold text-slate-300 border-b border-slate-700 pb-2 mb-3">{day}</h4>
              <div className="space-y-2">{allEvents.map((p, i) => (<div key={i} className={`flex justify-between text-sm p-2 rounded border ${p.type === 'school' ? 'bg-slate-900/50 border-purple-500/20' : 'bg-indigo-900/30 border-indigo-500/30'}`}><span className="text-white font-medium">{p.subject}</span><span className="font-mono text-xs text-slate-400">{p.time}</span></div>))}</div>
            </div>
          )
        })}
      </div>
    </div>
  );
}

function StudentAnalytics({ currentUser, db }) {
    const myGrades = db.grades.filter(g => g.studentUsername === currentUser.username);
    const average = myGrades.length ? (myGrades.reduce((a, b) => a + b.score, 0) / myGrades.length).toFixed(2) : 0;
    const allGrades = db.grades;
    const classAverage = allGrades.length ? (allGrades.reduce((a, b) => a + b.score, 0) / allGrades.length).toFixed(2) : 0;
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-blue-400 flex items-center gap-2"><BarChart3/> داشبورد تحلیل</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700"><p className="text-slate-400 text-xs">میانگین کل شما</p><p className={`text-2xl font-bold mt-1 ${average >= 17 ? 'text-green-400' : 'text-yellow-400'}`}>{average}</p></div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700"><p className="text-slate-400 text-xs">میانگین کلاس</p><p className="text-2xl font-bold mt-1 text-slate-200">{classAverage}</p></div>
        </div>
      </div>
    );
}

function StudentAIChat({ currentUser, db, setDb, setUser }) {
  const [messages, setMessages] = useState([{ role: 'assistant', text: `سلام ${currentUser.name}!`, persona: 'manager' }]);
  const [input, setInput] = useState('');
  const [activePersona, setActivePersona] = useState(AI_PERSONAS[1]); 
  const [isTyping, setIsTyping] = useState(false);
  const handleSend = async () => {
    if (!input.trim()) return;
    const newMsgs = [...messages, { role: 'user', text: input }];
    setMessages(newMsgs); setInput(''); setIsTyping(true);
    let responseText = "";
    if (db.apiKey) {
      responseText = await callGeminiAPI(db.apiKey, input, `${activePersona.sysPrompt} (فارسی، کوتاه)`);
    }
    if (!responseText) responseText = "[حالت آفلاین] لطفاً API Key را بررسی کنید.";
    setMessages(prev => [...prev, { role: 'assistant', text: responseText, persona: activePersona.id }]);
    setIsTyping(false);
  };
  return (
    <div className="flex flex-col h-[550px]">
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 border-b border-slate-700">{AI_PERSONAS.map(p => (<button key={p.id} onClick={() => setActivePersona(p)} className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all border ${activePersona.id === p.id ? `bg-slate-800 ${p.color} border-current` : 'bg-slate-900 text-slate-500 border-slate-700'}`}>{p.icon} <span>{p.name}</span></button>))}</div>
      <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-slate-800/30 rounded-xl">{messages.map((m, idx) => (<div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] p-3 rounded-xl ${m.role === 'user' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-200 border border-slate-600'}`}>{m.text}</div></div>))}</div>
      <div className="mt-4 flex gap-2"><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter' && handleSend()} className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white" placeholder={`پیام به ${activePersona.name}...`} /><button onClick={handleSend} disabled={isTyping} className="bg-cyan-600 text-white px-6 rounded-lg"><Send/></button></div>
    </div>
  );
}

function StudentExamSection({ currentUser, db }) {
    const myExams = db.exams.filter(e => e.classLevel === currentUser.classLevel);
    return (
      <div className="space-y-6"><h3 className="text-xl font-bold text-yellow-400 flex items-center gap-2"><Clock/> امتحانات</h3><div className="grid gap-4">{myExams.length === 0 ? <p className="text-slate-500">امتحانی ثبت نشده است.</p> : myExams.map(exam => (<div key={exam.id} className="flex items-center justify-between bg-slate-800 p-4 rounded-xl border-l-4 border-yellow-500"><div><h4 className="text-lg font-bold text-white">{exam.title}</h4><p className="text-slate-400 text-sm">تاریخ: {exam.date}</p></div></div>))}</div></div>
    );
}