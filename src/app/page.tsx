import { getConfig } from '../config';
import HomeClient from './HomeClient';

export default async function Home() {
  // Read config directly on server side
  const config = await getConfig();
  
  return (
    <HomeClient 
      javaIp={config.JAVA_IP || ''} 
      bedrockIp={config.BEDROCK_IP || ''} 
    />
  );
}
