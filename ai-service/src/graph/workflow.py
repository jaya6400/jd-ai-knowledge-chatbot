from langgraph.graph import StateGraph, END
from .state import GraphState
from .nodes import retrieve_node, generate_answer_node, generate_suggestions_node

workflow = StateGraph(GraphState)

workflow.add_node("retrieve", retrieve_node)
workflow.add_node("generate_answer", generate_answer_node)
workflow.add_node("generate_suggestions", generate_suggestions_node)

workflow.set_entry_point("retrieve")
workflow.add_edge("retrieve", "generate_answer")
workflow.add_edge("generate_answer", "generate_suggestions")
workflow.add_edge("generate_suggestions", END)

app = workflow.compile()
