import { getConfig } from '../config';
import HomeClient from './HomeClient';

function buildStartCommand(config: any): string {
  const MC_DIR = config.MC_DIR || '';
  const JAR_NAME = config.JAR_NAME || '';
  const MIN_RAM = (config.MIN_RAM || '1G').trim();
  const MAX_RAM = (config.MAX_RAM || '2G').trim();
  
  if (!MC_DIR || !JAR_NAME) {
    return '';
  }
  
  return `(cd ${MC_DIR} && java -Xms${MIN_RAM} -Xmx${MAX_RAM} -jar ${JAR_NAME} nogui)`;
}

export default async function Home() {
  // Read config directly on server side
  const config = await getConfig();
  const startCommand = buildStartCommand(config);
  
  return (
    <HomeClient 
      javaIp={config.JAVA_IP || ''} 
      bedrockIp={config.BEDROCK_IP || ''}
      startCommand={startCommand}
    />
  );
}
