import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from 'web';
import { Check } from 'lucide-react';

const PHOTO =
  'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=200&q=70';

export function Sizes() {
  return (
    <div className="flex items-center gap-3">
      <Avatar size="sm">
        <AvatarImage alt="Jefferson" src={PHOTO} />
        <AvatarFallback>JV</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarImage alt="Jefferson" src={PHOTO} />
        <AvatarFallback>JV</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarImage alt="Jefferson" src={PHOTO} />
        <AvatarFallback>JV</AvatarFallback>
      </Avatar>
    </div>
  );
}

export function Fallback() {
  return (
    <div className="flex items-center gap-3">
      <Avatar size="sm">
        <AvatarFallback>JV</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>MA</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>RS</AvatarFallback>
      </Avatar>
    </div>
  );
}

export function WithBadge() {
  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarImage alt="Jefferson" src={PHOTO} />
        <AvatarFallback>JV</AvatarFallback>
        <AvatarBadge />
      </Avatar>
      <Avatar size="lg">
        <AvatarImage alt="Jefferson" src={PHOTO} />
        <AvatarFallback>JV</AvatarFallback>
        <AvatarBadge>
          <Check />
        </AvatarBadge>
      </Avatar>
    </div>
  );
}

export function Group() {
  return (
    <AvatarGroup>
      <Avatar>
        <AvatarImage alt="Jefferson" src={PHOTO} />
        <AvatarFallback>JV</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>MA</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>RS</AvatarFallback>
      </Avatar>
      <AvatarGroupCount>+4</AvatarGroupCount>
    </AvatarGroup>
  );
}
