import { useState, useEffect, useCallback } from 'react';

export interface PermissionStatusState {
  camera: 'granted' | 'denied' | 'prompt' | 'unknown';
  geolocation: 'granted' | 'denied' | 'prompt' | 'unknown';
  allGranted: boolean;
  isChecking: boolean;
}

const STORAGE_KEY_PERMISSIONS = 'nb_permissions_granted';
const STORAGE_KEY_CAMERA = 'nb_camera_granted';
const STORAGE_KEY_LOCATION = 'nb_location_granted';

export function usePermissions() {
  const [status, setStatus] = useState<PermissionStatusState>(() => {
    const cachedBoth = localStorage.getItem(STORAGE_KEY_PERMISSIONS) === 'true';
    const cachedCam = localStorage.getItem(STORAGE_KEY_CAMERA) === 'true';
    const cachedLoc = localStorage.getItem(STORAGE_KEY_LOCATION) === 'true';

    return {
      camera: cachedCam || cachedBoth ? 'granted' : 'unknown',
      geolocation: cachedLoc || cachedBoth ? 'granted' : 'unknown',
      allGranted: cachedBoth || (cachedCam && cachedLoc),
      isChecking: true,
    };
  });

  const checkPermissions = useCallback(async () => {
    let camState: PermissionStatusState['camera'] = 'unknown';
    let geoState: PermissionStatusState['geolocation'] = 'unknown';

    // 1. Check Geolocation Permissions API
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const geoPerm = await navigator.permissions.query({ name: 'geolocation' });
        geoState = geoPerm.state;

        geoPerm.onchange = () => {
          setStatus((prev) => {
            const nextGeo = geoPerm.state;
            const all = nextGeo === 'granted' && prev.camera === 'granted';
            if (nextGeo === 'granted') localStorage.setItem(STORAGE_KEY_LOCATION, 'true');
            if (all) localStorage.setItem(STORAGE_KEY_PERMISSIONS, 'true');
            return {
              ...prev,
              geolocation: nextGeo,
              allGranted: all,
            };
          });
        };
      } catch {
        // Fallback to localStorage if permissions.query fails (e.g. older Safari)
        if (localStorage.getItem(STORAGE_KEY_LOCATION) === 'true') {
          geoState = 'granted';
        }
      }

      // 2. Check Camera Permissions API (supported in Chromium/Edge/Firefox)
      try {
        const camPerm = await navigator.permissions.query({ name: 'camera' as any });
        camState = camPerm.state;

        camPerm.onchange = () => {
          setStatus((prev) => {
            const nextCam = camPerm.state;
            const all = nextCam === 'granted' && prev.geolocation === 'granted';
            if (nextCam === 'granted') localStorage.setItem(STORAGE_KEY_CAMERA, 'true');
            if (all) localStorage.setItem(STORAGE_KEY_PERMISSIONS, 'true');
            return {
              ...prev,
              camera: nextCam,
              allGranted: all,
            };
          });
        };
      } catch {
        // Fallback to localStorage
        if (localStorage.getItem(STORAGE_KEY_CAMERA) === 'true') {
          camState = 'granted';
        }
      }
    } else {
      if (localStorage.getItem(STORAGE_KEY_LOCATION) === 'true') geoState = 'granted';
      if (localStorage.getItem(STORAGE_KEY_CAMERA) === 'true') camState = 'granted';
    }

    const all = camState === 'granted' && geoState === 'granted';
    if (all) {
      localStorage.setItem(STORAGE_KEY_PERMISSIONS, 'true');
    }

    setStatus({
      camera: camState,
      geolocation: geoState,
      allGranted: all,
      isChecking: false,
    });
  }, []);

  const markCameraGranted = useCallback(() => {
    localStorage.setItem(STORAGE_KEY_CAMERA, 'true');
    setStatus((prev) => {
      const all = prev.geolocation === 'granted';
      if (all) localStorage.setItem(STORAGE_KEY_PERMISSIONS, 'true');
      return {
        ...prev,
        camera: 'granted',
        allGranted: all,
      };
    });
  }, []);

  const markGeolocationGranted = useCallback(() => {
    localStorage.setItem(STORAGE_KEY_LOCATION, 'true');
    setStatus((prev) => {
      const all = prev.camera === 'granted';
      if (all) localStorage.setItem(STORAGE_KEY_PERMISSIONS, 'true');
      return {
        ...prev,
        geolocation: 'granted',
        allGranted: all,
      };
    });
  }, []);

  const markAllGranted = useCallback(() => {
    localStorage.setItem(STORAGE_KEY_PERMISSIONS, 'true');
    localStorage.setItem(STORAGE_KEY_CAMERA, 'true');
    localStorage.setItem(STORAGE_KEY_LOCATION, 'true');
    setStatus({
      camera: 'granted',
      geolocation: 'granted',
      allGranted: true,
      isChecking: false,
    });
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    ...status,
    checkPermissions,
    markCameraGranted,
    markGeolocationGranted,
    markAllGranted,
  };
}
