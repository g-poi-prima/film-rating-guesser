interface UserAvatarProps {
  username: string;
  avatar?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-14 h-14 text-xl',
};

export default function UserAvatar({ username, avatar, size = 'md', className = '' }: UserAvatarProps) {
  return (
    <div className={`${sizes[size]} rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0 ${className}`}>
      {avatar ? (
        <img
          src={avatar}
          alt={username}
          className="w-full h-full object-cover"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.display = 'none';
            // Show initial as fallback
            const parent = img.parentElement;
            if (parent && !parent.querySelector('span')) {
              const span = document.createElement('span');
              span.className = 'font-bold text-primary';
              span.textContent = username.charAt(0).toUpperCase();
              parent.appendChild(span);
            }
          }}
        />
      ) : (
        <span className="font-bold text-primary">{username.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}
