from typing import Any

from polycli.polyagent import PolyAgent
from polycli.orchestration import pattern


@pattern
def read_file(agent: PolyAgent, path: str):
    # 读取并总结（示例）；写码类统一使用 qwen-code
    return agent.run(f"Read and summarize file: {path}", cli="qwen-code")


@pattern
def write_code(agent: PolyAgent, instruction: str, files_payload: dict):
    # 将特定文件读写任务交给 qwen-code
    prompt = (
        "You are a coding agent. Apply the following change to the workspace.\n"
        f"Instruction:\n{instruction}\n\n"
        f"Files payload (json):\n{files_payload}"
    )
    return agent.run(prompt, cli="qwen-code")


