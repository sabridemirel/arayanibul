import type { SVGProps } from 'react';

const PawIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <ellipse cx="6" cy="10.5" rx="2" ry="2.6" />
    <ellipse cx="10" cy="6.5" rx="2" ry="2.6" />
    <ellipse cx="14" cy="6.5" rx="2" ry="2.6" />
    <ellipse cx="18" cy="10.5" rx="2" ry="2.6" />
    <path d="M12 11.5c-2.9 0-5.5 3-5.5 5.4 0 1.5 1.1 2.4 2.5 2.4 1.1 0 1.9-.5 3-.5s1.9.5 3 .5c1.4 0 2.5-.9 2.5-2.4 0-2.4-2.6-5.4-5.5-5.4z" />
  </svg>
);

export default PawIcon;
