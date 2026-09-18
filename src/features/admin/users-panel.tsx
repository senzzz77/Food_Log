import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Eye, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/field";
import { ProfileDataPanel } from "@/features/admin/profile-data-panel";
import { deleteAdminProfile, deleteUser, listUserProfiles, listUsers, updateUserRole, type AdminProfile, type AdminUser } from "@/services/admin-service";
import { useAppStore } from "@/stores/app-store";
import type { UserRole } from "@/types/domain";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("zh-CN");
}

export function UsersPanel() {
  const token = useAppStore((state) => state.authToken);
  const currentUserId = useAppStore((state) => state.user?.id);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [pendingUser, setPendingUser] = useState<AdminUser | null>(null);
  const [pendingProfile, setPendingProfile] = useState<AdminProfile | null>(null);
  const [openedProfile, setOpenedProfile] = useState<AdminProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    setLoading(true);
    void listUsers(token)
      .then(({ users: items }) => { if (alive) { setUsers(items); setMessage(null); } })
      .catch((error: Error) => { if (alive) setMessage(error.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token, reloadKey]);

  useEffect(() => {
    if (!token || !expandedId) { setProfiles([]); setOpenedProfile(null); return; }
    let alive = true;
    void listUserProfiles(token, expandedId)
      .then(({ profiles: items }) => { if (alive) setProfiles(items); })
      .catch((error: Error) => { if (alive) setMessage(error.message); });
    return () => { alive = false; };
  }, [token, expandedId, reloadKey]);

  const refresh = () => setReloadKey((value) => value + 1);

  const changeRole = async (user: AdminUser, role: UserRole) => {
    if (!token || role === user.role) return;
    setBusyId(user.id);
    try {
      await updateUserRole(token, user.id, role);
      setMessage(null);
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法修改角色。");
    } finally { setBusyId(null); }
  };

  const confirmRemoveUser = async () => {
    if (!token || !pendingUser) return;
    setDeleting(true);
    try {
      await deleteUser(token, pendingUser.id);
      if (expandedId === pendingUser.id) setExpandedId(null);
      setPendingUser(null);
      setMessage(null);
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法删除用户。");
    } finally { setDeleting(false); }
  };

  const confirmRemoveProfile = async () => {
    if (!token || !pendingProfile) return;
    setDeleting(true);
    try {
      await deleteAdminProfile(token, pendingProfile.id);
      if (openedProfile?.id === pendingProfile.id) setOpenedProfile(null);
      setPendingProfile(null);
      setMessage(null);
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法删除档案。");
    } finally { setDeleting(false); }
  };

  return <section className="panel rounded-md">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7eee4] px-5 py-4 dark:border-[#354337]">
      <div><h2 className="font-semibold">用户与角色</h2><p className="subtle-text mt-1 text-xs">管理员可以查看全部用户、调整角色，并清理账号或档案。</p></div>
      <Button variant="secondary" onClick={refresh} disabled={loading}><RefreshCw size={15} />刷新</Button>
    </header>
    {message && <p className="border-b border-[#f0ded9] bg-[#fff6f4] px-5 py-2.5 text-sm text-[#9f4336] dark:border-[#4a2f2c] dark:bg-[#34211f] dark:text-[#f0aaa0]">{message}</p>}
    {loading ? <p className="subtle-text px-5 py-8 text-sm">正在读取用户...</p> : <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead><tr className="subtle-text text-left text-xs"><th className="px-5 py-3 font-medium">用户名</th><th className="px-5 py-3 font-medium">角色</th><th className="px-5 py-3 font-medium">档案</th><th className="px-5 py-3 font-medium">注册时间</th><th className="px-5 py-3 font-medium text-right">操作</th></tr></thead>
        <tbody>{users.map((user) => {
          const isSelf = user.id === currentUserId;
          const expanded = expandedId === user.id;
          return <tr key={user.id} className="border-t border-[#eef3ec] align-middle dark:border-[#2c382e]">
            <td className="px-5 py-3"><span className="font-medium">{user.username}</span>{isSelf && <span className="subtle-text ml-2 text-xs">（当前登录）</span>}</td>
            <td className="px-5 py-3"><Select className="h-9 w-32" value={user.role} disabled={isSelf || busyId === user.id} onChange={(event) => void changeRole(user, event.target.value as UserRole)}><option value="user">普通用户</option><option value="admin">管理员</option></Select></td>
            <td className="px-5 py-3"><button className="subtle-text inline-flex items-center gap-1 hover:text-[#3c6b43] dark:hover:text-[#d7ebd1]" onClick={() => setExpandedId(expanded ? null : user.id)}>{expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}{Number(user.profileCount)} 个</button></td>
            <td className="subtle-text px-5 py-3">{formatDate(user.createdAt)}</td>
            <td className="px-5 py-3 text-right"><button className="subtle-text p-1 disabled:opacity-40 hover:text-[#b34a3e]" title={isSelf ? "不能删除当前登录的账号" : "删除用户"} disabled={isSelf} onClick={() => setPendingUser(user)}><Trash2 size={16} /></button></td>
          </tr>;
        })}</tbody>
      </table>
      {expandedId && <div className="border-t border-[#eef3ec] bg-[#f8fbf5] px-5 py-4 dark:border-[#2c382e] dark:bg-[#1b241c]">
        <h3 className="text-xs font-semibold tracking-wide text-[#5f7d6d] uppercase">该用户的档案</h3>
        {profiles.length ? <ul className="mt-3 grid gap-2 sm:grid-cols-2">{profiles.map((profile) => <li key={profile.id} className="rounded-md border border-[#e1e9dc] bg-white px-3 py-2 text-sm dark:border-[#3d5040] dark:bg-[#202b22]">
          <div className="flex items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-2"><span className="size-3 flex-none rounded-full" style={{ backgroundColor: profile.accent }} /><span className="truncate">{profile.displayName}</span></span><span className="flex flex-none items-center gap-1"><button className="subtle-text inline-flex items-center gap-1 px-1 text-xs hover:text-[#3c6b43] dark:hover:text-[#d7ebd1]" title="查看该档案的数据与记录" onClick={() => setOpenedProfile(openedProfile?.id === profile.id ? null : profile)}><Eye size={15} />查看数据</button><button className="subtle-text p-1 hover:text-[#b34a3e]" title="删除该档案" onClick={() => setPendingProfile(profile)}><Trash2 size={15} /></button></span></div>
        </li>)}</ul> : <p className="subtle-text mt-2 text-sm">该用户还没有档案。</p>}
        {openedProfile && token && profiles.some((item) => item.id === openedProfile.id) && <ProfileDataPanel token={token} profile={openedProfile} onClose={() => setOpenedProfile(null)} />}
      </div>}
    </div>}
    <ConfirmDialog open={pendingUser !== null} onOpenChange={(open) => { if (!open) setPendingUser(null); }} title="删除用户" description={`删除「${pendingUser?.username ?? ""}」会同时清除他的全部档案、饮食记录与体重记录，且无法恢复。`} pending={deleting} onConfirm={() => void confirmRemoveUser()} />
    <ConfirmDialog open={pendingProfile !== null} onOpenChange={(open) => { if (!open) setPendingProfile(null); }} title="删除档案" description={`删除「${pendingProfile?.displayName ?? ""}」后，该档案的身体指标、饮食记录与体重记录会一并清除。`} pending={deleting} onConfirm={() => void confirmRemoveProfile()} />
  </section>;
}
