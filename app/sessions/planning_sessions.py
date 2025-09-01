from typing import Optional, List
from pydantic import BaseModel

from polycli.polyagent import PolyAgent
from polycli.session_registry import session_def
from polycli.orchestration import pattern


class FileNode(BaseModel):
    name: str
    kind: str  # "dir" | "file"
    children: Optional[List["FileNode"]] = None
    content: Optional[str] = None


class StructurePlan(BaseModel):
    project_name: str
    overview: str
    files: List[FileNode]


@pattern
def generate_structure_plan(agent: PolyAgent, requirement: str, project_name: str = "project") -> StructurePlan:
    prompt = (
        "You are a senior software architect.\n"
        f"Project name: {project_name}.\n"
        "Based on the user's requirement below, design a pragmatic, minimal, and conventional file/directory structure.\n"
        "- Prefer standard naming and common scaffolding for the chosen tech stack.\n"
        "- Only include necessary files; avoid placeholders unless important.\n"
        "- Put explanations in 'overview' and keep file contents succinct if included.\n\n"
        f"Requirement:\n{requirement}\n"
        "Return the result strictly conforming to the provided schema."
    )
    result = agent.run(prompt, cli="no-tools", schema_cls=StructurePlan, tracked=True)
    return result


@session_def(
    name="Project Structure Planner",
    description="Generate a project directory structure from a requirement",
    params={"requirement": str, "project_name": str},
    category="Scaffolding",
)
def project_structure_planner(requirement: str, project_name: str = "project"):
    agent = PolyAgent(id="structure-planner", debug=True)
    res = generate_structure_plan(agent, requirement, project_name)
    if hasattr(res, "has_data") and res.has_data():
        plan = res.data
    else:
        plan = StructurePlan(project_name=project_name, overview=str(getattr(res, "content", "")), files=[])
    return plan


