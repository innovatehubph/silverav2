import { useAuthStore } from '../stores';

export default function Profile() {
  const { user } = useAuthStore();

  return (
    <div className="container-custom py-8">
      <h1 className="section-title mb-8">My Profile</h1>
      
      {user && (
        <div className="card p-6 max-w-md">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">{user.name[0]?.toUpperCase()}</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user.name}</h2>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Role</span>
              <span className="capitalize">{user.role}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
