import { useSelector } from 'react-redux';

/**
 * Beta features configuration object
 * Contains all available beta feature keys
 */
export const BETA_FEATURES = Object.freeze({
  NODE_VM: 'nodevm',
  OPENAPI_SYNC: 'openapi-sync'
});

/**
 * Features that are always enabled (graduated from beta)
 */
const ALWAYS_ENABLED = [BETA_FEATURES.OPENAPI_SYNC];

/**
 * Hook to check if a beta feature is enabled
 * @param {string} featureName - The name of the beta feature
 * @returns {boolean} - Whether the feature is enabled
 */
export const useBetaFeature = (featureName) => {
  const preferences = useSelector((state) => state.app.preferences);
  if (ALWAYS_ENABLED.includes(featureName)) return true;
  return preferences?.beta?.[featureName] || false;
};
