function UserAvatar({ firstName = '', lastName = '' }) {
  const initials =
    `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="w-10 h-10 rounded-full bg-[#004687] text-white flex items-center justify-center font-semibold text-sm">
      {initials || 'U'}
    </div>
  );
}

export default UserAvatar;