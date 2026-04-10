export default function BitcoderLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 110 115"
      className={className}
    >
      <path
        d="M 45,10 L 45,70 A 35,35 0 0,1 10,105 L 10,45 A 35,35 0 0,1 45,10 Z"
        fill="#157382"
      />
      <circle cx="80" cy="29" r="19" fill="#3BB1B9" />
      <circle cx="80" cy="86" r="19" fill="#8FD3D9" />
    </svg>
  );
}
