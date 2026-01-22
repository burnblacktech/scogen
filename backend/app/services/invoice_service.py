from jinja2 import Environment, FileSystemLoader
from datetime import datetime
import os

class InvoiceService:
    def __init__(self):
        # Using absolute path to templates to be safe
        template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
        self.template_env = Environment(loader=FileSystemLoader(template_dir))

    def generate_pro_forma(self, project_name: str, amount: float, is_rush: bool) -> str:
        """
        Generates a PDF-ready HTML invoice.
        """
        template = self.template_env.get_template("invoice.html")
        
        # Determine line items
        items = [{"desc": "Software Architecture & Development Core", "price": amount}]
        if is_rush:
            # Logic: If Rush is active, we might split the bill visually (optional)
            items = [
                {"desc": "Standard Software Development Core", "price": amount * 0.5}, # Dummy split for visual
                {"desc": "Priority Resource Allocation (RUSH)", "price": amount * 0.5}
            ]

        html_content = template.render(
            invoice_id=f"INV-{int(datetime.utcnow().timestamp())}",
            date=datetime.utcnow().strftime("%Y-%m-%d"),
            project_name=project_name,
            items=items,
            total=amount,
            status="DUE ON RECEIPT"
        )
        
        # In a real app, convert to PDF here. For MVP, save HTML.
        filename = f"INVOICE_{project_name.replace(' ', '_')}.html"
        # For Scogen dev, we save to a predictable path
        output_path = os.path.join(os.getcwd(), "backend", "temp", filename)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html_content)
            
        return f"/temp/{filename}" # Mock URL
