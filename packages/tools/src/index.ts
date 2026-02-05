/**
 * @atlas/tools - Built-in tools
 */

export { fileTools, readFileTool, writeFileTool, listDirectoryTool, searchFilesTool, deleteTool, readFileOutlineTool, readFileRangeTool } from './file-tool.js';
export { shellTools, shellTool, getEnvTool, getCwdTool } from './shell-tool.js';
export { todoTools, sendTodoTool, updateTodoStepTool, readProjectContextTool, updateProjectContextTool, getActiveTodoTool, setTodoManager, setTelegramChannel } from './todo-tools.js';

// Re-export combined tools
import { fileTools } from './file-tool.js';
import { shellTools } from './shell-tool.js';
import { todoTools } from './todo-tools.js';
import { templateTools } from './template-tools.js';
import { memoryTools } from './memory-tools.js';
import type { ToolDefinition } from '@atlas/core';

export { templateTools, listTemplatesTool, createFromTemplateTool } from './template-tools.js';
export { memoryTools, searchMemoryTool, rememberFactTool, listFactsTool, setMemoryManager, setEpisodicMemory, rememberEpisodeTool, recallEpisodesTool, getLearningsTool } from './memory-tools.js';
export { idleTools, notifyBoredTool } from './idle-tools.js';
import { idleTools } from './idle-tools.js';
export { apiTools, httpRequestConfig, runLoadTestConfig } from './api-tool.js';
import { apiTools } from './api-tool.js';
export { voiceTools, generateVoiceConfig } from './voice-tool.js';
import { voiceTools } from './voice-tool.js';
export { sendFileConfig } from './send-file-tool.js';
import { sendFileConfig } from './send-file-tool.js';
export { taskTools, enqueueTasksTool, listTasksTool, scheduleTaskTool, setTaskManager } from './task-tools.js';
import { taskTools } from './task-tools.js';

export const allTools: ToolDefinition[] = [...fileTools, ...shellTools, ...todoTools, ...templateTools, ...memoryTools, ...idleTools, ...apiTools, ...voiceTools, ...taskTools, sendFileConfig];


