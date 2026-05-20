import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { Button, Input } from '../components/atomics';
import toast from 'react-hot-toast';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
}

export function RegisterPage() {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<RegisterForm>();
  const navigate = useNavigate();

  const onSubmit = async (data: RegisterForm) => {
    try {
      await authService.register(data);
      toast.success('Registration successful. Please login.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="auth-page">
      <h1>Register</h1>
      <p className="auth-subtitle">Create your account</p>

      <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
        <div className="form-group">
          <Input
            label="Name"
            type="text"
            placeholder="Your name"
            {...register('name', { required: 'Name is required' })}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('name', e.target.value)}
            error={errors.name?.message}
          />
        </div>

        <div className="form-group">
          <Input
            label="Email"
            type="text"
            placeholder="you@antares.id"
            {...register('email', { required: 'Email is required' })}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('email', e.target.value)}
            error={errors.email?.message}
          />
        </div>

        <div className="form-group">
          <Input
            label="Password"
            type="password"
            placeholder="••••••"
            {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('password', e.target.value)}
            error={errors.password?.message}
          />
        </div>

        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Registering...' : 'Register'}
        </Button>
      </form>

      <p className="auth-link">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
