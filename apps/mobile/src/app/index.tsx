import { Redirect } from 'expo-router';

export default function Root() {
  // Redirect to the first tab automatically
  return <Redirect href="/(tabs)/" />;
}