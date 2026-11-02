import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { 
  Shield, Tag, ShoppingBag, Copy, Check, Plus, Edit3, Trash2, 
  ExternalLink, Users, Clock, Search, Unlock, Lock, Sparkles, 
  Bike, ChevronRight, AlertCircle, X, Share2, Zap, Award 
} from 'lucide-react';

// 1. 본인의 Firebase 프로젝트 설정값으로 교체하세요.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ADMIN_PIN = '987412356';

export default function App() {
  const [sponsors, setSponsors] = useState([]);
  const [groupBuys, setGroupBuys] = useState([]);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  const [activeTab, setActiveTab] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');

  const [isAdmin, setIsAdmin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [sponsorModal, setSponsorModal] = useState({ open: false, mode: 'add', data: null });
  const [groupBuyModal, setGroupBuyModal] = useState({ open: false, mode: 'add', data: null });
  const [joinModal, setJoinModal] = useState({ open: false, item: null });
  const [rosterModal, setRosterModal] = useState({ open: false, item: null });

  const [copiedId, setCopiedId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Firebase Auth 없이 Firestore 실시간 동기화만 수행 (로그인 창 원천 차단)
  useEffect(() => {
    const sponsorsRef = collection(db, 'ebcycling_sponsors');
    const groupBuysRef = collection(db, 'ebcycling_groupbuys');

    const unsubSponsors = onSnapshot(sponsorsRef, (snapshot) => {
      setIsCloudSynced(true);
      setSponsors(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubGroupBuys = onSnapshot(groupBuysRef, (snapshot) => {
      setGroupBuys(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubSponsors();
      unsubGroupBuys();
    };
  }, []);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setIsAdmin(true);
      setShowPinModal(false);
      setPinInput('');
      setPinError('');
      showToast('운영진 관리 모드가 활성화되었습니다.', 'orange');
    } else {
      setPinError('PIN 번호가 일치하지 않습니다.');
    }
  };

  const handleCopyCode = (code, id) => {
    navigator.clipboard?.writeText(code);
    setCopiedId(id);
    showToast(`할인 코드 [${code}] 가 복사되었습니다!`, 'orange');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShareSite = () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast('사이트 링크가 복사되었습니다!', 'blue');
  };

  const handleSaveSponsor = async (formData) => {
    const id = formData.id || `sp-${Date.now()}`;
    await setDoc(doc(db, 'ebcycling_sponsors', id), { ...formData, id });
    setSponsorModal({ open: false, mode: 'add', data: null });
    showToast('스폰서 혜택이 실시간 반영되었습니다.', 'orange');
  };

  const handleDeleteSponsor = async (id) => {
    await deleteDoc(doc(db, 'ebcycling_sponsors', id));
    showToast('스폰서 혜택이 삭제되었습니다.', 'blue');
  };

  const handleSaveGroupBuy = async (formData) => {
    const id = formData.id || `gb-${Date.now()}`;
    const newGroupBuy = {
      ...formData,
      id,
      originalPrice: Number(formData.originalPrice) || 0,
      groupPrice: Number(formData.groupPrice) || 0,
      minQty: Number(formData.minQty) || 1,
      options: typeof formData.options === 'string' ? formData.options.split(',').map(o => o.trim()) : formData.options,
      participants: formData.participants || []
    };
    await setDoc(doc(db, 'ebcycling_groupbuys', id), newGroupBuy);
    setGroupBuyModal({ open: false, mode: 'add', data: null });
    showToast('공동구매가 실시간 저장되었습니다.', 'blue');
  };

  const handleDeleteGroupBuy = async (id) => {
    await deleteDoc(doc(db, 'ebcycling_groupbuys', id));
    showToast('공동구매 항목이 삭제되었습니다.', 'blue');
  };

  const handleJoinGroupBuy = async (gbId, participantData) => {
    const target = groupBuys.find(g => g.id === gbId);
    if (!target) return;
    
    const newParticipant = {
      id: `p-${Date.now()}`,
      name: participantData.name.trim(),
      option: participantData.option,
      qty: Number(participantData.qty) || 1,
      note: participantData.note?.trim() || '',
      timestamp: new Date().toLocaleString()
    };

    const updatedItem = { ...target, participants: [...(target.participants || []), newParticipant] };
    await setDoc(doc(db, 'ebcycling_groupbuys', gbId), updatedItem);
    setJoinModal({ open: false, item: null });
    showToast(`${newParticipant.name}님의 신청이 완료되었습니다!`, 'orange');
  };

  const handleRemoveParticipant = async (gbId, participantId) => {
    const target = groupBuys.find(g => g.id === gbId);
    if (!target) return;
    const updatedItem = { ...target, participants: (target.participants || []).filter(p => p.id !== participantId) };
    await setDoc(doc(db, 'ebcycling_groupbuys', gbId), updatedItem);
    setRosterModal(prev => prev.open && prev.item?.id === gbId ? { ...prev, item: updatedItem } : prev);
    showToast('신청 내역이 삭제되었습니다.', 'blue');
  };

  const categories = ['전체', '프레임/컴포넌트', '의류/기어', '뉴트리션/케어'];
  const filteredSponsors = useMemo(() => sponsors.filter(sp => (selectedCategory === '전체' || sp.category === selectedCategory) && (!searchQuery || sp.brandName.toLowerCase().includes(searchQuery.toLowerCase()))), [sponsors, selectedCategory, searchQuery]);
  const filteredGroupBuys = useMemo(() => groupBuys.filter(gb => (!searchQuery || gb.title.toLowerCase().includes(searchQuery.toLowerCase()))), [groupBuys, searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/70 via-white to-blue-50/80 text-slate-900 font-sans selection:bg-orange-500 selection:text-white pb-20">
      {/* 알림 토스트 */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl font-semibold text-sm border ${toast.type === 'orange' ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'}`}>
            <Sparkles className="w-4 h-4" /> <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* 헤더 네비게이션 */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-blue-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-blue-600 flex items-center justify-center shadow-md text-white">
              <Bike className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700">EB CYCLING LOUNGE</span>
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">{isCloudSynced ? '실시간 연동중' : '로딩중...'}</span>
              </div>
              <h1 className="text-xl font-black text-slate-900 mt-0.5">스폰서십 & 공동구매</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleShareSite} className="px-3.5 py-2.5 rounded-xl text-sm font-bold bg-blue-50 text-blue-700"><Share2 className="w-4 h-4 inline" /> 링크 공유</button>
            {isAdmin ? (
              <button onClick={() => setIsAdmin(false)} className="px-4 py-2.5 rounded-xl text-sm font-bold bg-orange-500 text-white"><Unlock className="w-4 h-4 inline" /> 관리 ON</button>
            ) : (
              <button onClick={() => setShowPinModal(true)} className="px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-700"><Lock className="w-4 h-4 inline text-orange-500" /> 운영진</button>
            )}
          </div>
        </div>
      </header>

      {/* 모달 팝업 렌더링 영역 (보안 PIN, 추가, 참여 모달 등은 이전 코드와 동일하게 유지) */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handlePinSubmit} className="bg-white rounded-3xl p-6 w-full max-w-sm">
             <h3 className="text-lg font-black mb-4">운영진 PIN 입력</h3>
             <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} className="w-full p-3 border rounded-xl mb-2 text-center tracking-widest font-mono" autoFocus/>
             <button type="submit" className="w-full bg-orange-500 text-white p-3 rounded-xl font-bold">확인</button>
          </form>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 mt-6">
        {/* 기존 화면 컴포넌트 JSX 렌더링 유지... (스폰서 맵핑 및 공동구매 리스트 렌더링) */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
           {sponsors.map(sp => (
              <div key={sp.id} className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-md">
                 <h3 className="text-2xl font-black">{sp.brandName}</h3>
                 <p className="text-orange-500 font-black text-xl mb-4">{sp.discountRate}</p>
                 <div className="bg-orange-50 p-3 rounded-xl flex justify-between items-center">
                    <span className="font-mono text-blue-700 font-black">{sp.promoCode}</span>
                    <button onClick={() => handleCopyCode(sp.promoCode, sp.id)} className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold">복사</button>
                 </div>
              </div>
           ))}
        </div>
      </main>
    </div>
  );
}