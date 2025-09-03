import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export default function DebugNav() {
  const location = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    // react-router Events
    // eslint-disable-next-line no-console
    console.log('[Nav] type=%s path=%s', navType, location.pathname + location.search + location.hash);
  }, [location, navType]);

  useEffect(() => {
    // History API hook (findet auch Navigations außerhalb von useNavigate/Navigate)
    const origPush = history.pushState;
    const origReplace = history.replaceState;

    history.pushState = function (...args) {
      // eslint-disable-next-line no-console
      console.log('[history.pushState]', args);
      console.trace();
      return origPush.apply(this, args);
    };
    history.replaceState = function (...args) {
      // eslint-disable-next-line no-console
      console.log('[history.replaceState]', args);
      console.trace();
      return origReplace.apply(this, args);
    };

    return () => {
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, []);

  return null;
}
