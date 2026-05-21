import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../stores/useAuthStore';
import { authService } from '../services/auth.service';
import toast from 'react-hot-toast';

interface EditForm {
  name: string;
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [editing, setEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditForm>({ defaultValues: { name: user?.name || '' } });

  const onSubmit = async (data: EditForm) => {
    try {
      await authService.updateProfile({ name: data.name });
      const updatedUser = { ...user!, name: data.name };
      updateUser(updatedUser);
      reset({ name: data.name });
      toast.success('Nama berhasil diperbarui');
      setEditing(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui profil');
    }
  };

  const handleCancel = () => {
    reset({ name: user?.name || '' });
    setEditing(false);
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profil Saya</h1>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {/* Avatar + identity */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{user?.name || '—'}</p>
            <p className="text-sm text-gray-400">{user?.email || '—'}</p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5 space-y-5">
          {/* Name field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Nama
              </label>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSubmit(onSubmit)}>
                <input
                  type="text"
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  {...register('name', { required: 'Nama wajib diisi', maxLength: { value: 100, message: 'Maksimal 100 karakter' } })}
                />
                {errors.name && (
                  <span className="text-xs text-red-500 mt-1 block">{errors.name.message}</span>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-gray-800">{user?.name || '—'}</p>
            )}
          </div>

          {/* Email — read only */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Email
            </label>
            <p className="text-sm text-gray-800">{user?.email || '—'}</p>
          </div>

          {/* Role — read only */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Role
            </label>
            <p className="text-sm text-gray-800">Employee</p>
          </div>
        </div>
      </div>
    </div>
  );
}
