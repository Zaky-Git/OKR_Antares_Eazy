import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../stores/useAuthStore';
import toast from 'react-hot-toast';

interface LoginForm {
  email: string;
  password: string;
}

export function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>();
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await authService.login(data);
      login(res.data.data.token, res.data.data.user);
      toast.success('Login berhasil');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login gagal');
    }
  };

  return (
    <div className="flex min-h-screen ">
      <div className="hidden lg:flex w-1/2 bg-[#194FBC] flex-col justify-center px-12 xl:px-20 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.08]">
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-white rounded-full" />
          <div className="absolute bottom-[-40px] right-[-40px] w-64 h-64 bg-white rounded-full" />
          <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-white rounded-full" />
        </div>

        <div className="relative z-10">
          <div className="text-2xl font-extrabold tracking-tight mb-14">
            <span className="text-white">eazy</span> <span className="text-white/90 font-bold">OKR</span>
          </div>

          <h1 className="text-[2.75rem] font-extrabold leading-[1.15] mb-4">
            Selamat Datang<br />Kembali!
          </h1>
          <p className="text-white/75 text-[1.05rem] leading-relaxed mb-12 max-w-[420px]">
            Masuk ke akun Anda untuk melanjutkan mengelola OKR dan kinerja tim.
          </p>

          <div className="space-y-5">
            <div className="flex items-start gap-4 bg-white/[0.08] rounded-xl px-5 py-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M16.667 5L7.5 14.167 3.333 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <strong className="block text-[0.9rem] font-semibold mb-0.5">Pantau Kemajuan</strong>
                <p className="text-[0.82rem] text-white/65 leading-snug">Pantau objektif dan hasil utama secara real-time</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/[0.08] rounded-xl px-5 py-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M16.667 5L7.5 14.167 3.333 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <strong className="block text-[0.9rem] font-semibold mb-0.5">Kolaborasi Tim</strong>
                <p className="text-[0.82rem] text-white/65 leading-snug">Samakan visi dan fokus bersama tim Anda</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/[0.08] rounded-xl px-5 py-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M16.667 5L7.5 14.167 3.333 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <strong className="block text-[0.9rem] font-semibold mb-0.5">Keputusan Berbasis Data</strong>
                <p className="text-[0.82rem] text-white/65 leading-snug">Dapatkan insight untuk keputusan yang lebih baik</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#FAFBFC]">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden text-center mb-10">
            <span className="text-[#194FBC] font-extrabold text-2xl">eazy</span>
            <span className="font-bold text-2xl text-gray-800"> OKR</span>
          </div>

          <h2 className="text-[1.6rem] font-bold text-gray-900 mb-1.5">Masuk ke Akun Anda</h2>
          <p className="text-gray-500 text-sm mb-8">Kelola OKR dan pantau kinerja tim Anda</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <input
                  type="email"
                  placeholder="nama@perusahaan.com"
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#194FBC] focus:ring-2 focus:ring-[#194FBC]/10 transition-all placeholder:text-gray-400"
                  {...register('email', { required: 'Email wajib diisi' })}
                />
              </div>
              {errors.email && <span className="text-xs text-red-500 mt-1.5 block">{errors.email.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Kata Sandi</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  type="password"
                  placeholder="Masukkan kata sandi Anda"
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#194FBC] focus:ring-2 focus:ring-[#194FBC]/10 transition-all placeholder:text-gray-400"
                  {...register('password', { required: 'Kata sandi wajib diisi' })}
                />
              </div>
              {errors.password && <span className="text-xs text-red-500 mt-1.5 block">{errors.password.message}</span>}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#194FBC] text-white font-semibold rounded-xl hover:bg-[#153f9a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-7">
            Belum punya akun?{' '}
            <Link to="/register" className="text-[#194FBC] font-semibold hover:underline">Daftar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
