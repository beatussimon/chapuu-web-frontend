import { useUser } from '../context/UserContext';
import { NativeState } from '../types';

export function useWebViewStateUpdate() {
  const { updateUser } = useUser();

  const handleStateUpdate = (state: Partial<NativeState> | null) => {
    if (state) {
      const { userRole: newRole, token: newToken } = state;
      updateUser(newRole || 'CUSTOMER', newToken || null);
    } else {
      updateUser('CUSTOMER', null);
    }
  };

  return handleStateUpdate;
}
