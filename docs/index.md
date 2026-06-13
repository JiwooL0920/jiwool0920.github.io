# Jiwoo Lee

<div class="profile-header" markdown>

**AI Platform Engineer II** · Sanofi · Toronto, Canada

[:fontawesome-brands-github: JiwooL0920](https://github.com/JiwooL0920){ .md-button }
[:fontawesome-brands-linkedin: jiwool0920](https://www.linkedin.com/in/jiwool0920/){ .md-button }

</div>

---

## About

Platform Engineer specializing in Kubernetes-based AI/ML platforms and agentic infrastructure, with experience building and operating multi-region systems at enterprise scale. Proven track record delivering production-grade platform primitives, improving performance, and enabling scalable multi-agent systems.

Having worked across both AI platform and ML product teams, I've seen firsthand how critical strong infrastructure is to enabling teams to move fast. While much of the industry focuses on product development, far fewer engineers understand what it takes to run ML systems reliably in production and at scale. That gap is where I've chosen to focus my career.

I'm shaping my career as an ML Infrastructure / AI Platform engineer, building the runtime, reliability, and operational foundations that allow teams to ship safely and sustainably.

---

## Experience

<div class="job" markdown>

### DevOps Engineer II — AI Platform
**[Sanofi](https://www.sanofi.com)** · Mar 2025 – Present · 1 yr 4 mos

AI Foundry team operates a central AI/ML platform to accelerate the development and deployment of 950+ internal projects across AWS EKS and Tencent Cloud.

**Platform Engineering:**

- Proposed and leading 0→1 development of an agentic system enablement on Kubernetes Platform infrastructure with Kagents and AgentGateway, defining the next-generation interaction layer for platform operations (natural-language AIOps, automated incident response)
- Owned platform-wide Redis Sentinel caching with automatic failover, improving backend API response times by 98.3% and reducing observability query latency by 55%
- Led Bottlerocket OS migration across EKS clusters, reducing node startup time by 87% while improving security and reducing AMI/GPU driver overhead

**Cross-functional:**

- Contributing on the enterprise Agents Hub that enables cross-team agent registration, invocation, observability, and governance; matured data assets integration and delivered terraform modules for AWS Bedrock/AgentCore memory, guardrail, MCP, and multi-agent orchestration
- Acted as a dedicated devops partner — Openshift deployment and reduced CI/CD pipeline time by 40% for Sanofi's Data Platform chatbot

</div>

<div class="job" markdown>

### Software Engineer I — Rotational Development Program
**[Sanofi](https://www.sanofi.com)** · May 2023 – Mar 2025 · 1 yr 11 mos

Built engineering foundation on core AI/ML lifecycle across AI Platform and ML product teams.

**[Rotation 1] AI Platform**

- Improved startup time and cost efficiency of user Jupyter notebook pods by designing Temporal workflow scheduling
- Enabled AWS infrastructure provisioning via Crossplane-based IaC on the deployment microservice
- Refactored a core deployment service end-to-end, improving scalability and reliability

**[Rotation 2]: R&D — Early stage drug discovery**

- Implemented EMR Serverless features including scheduling Spark jobs

**[Rotation 3]: R&D — RAG LLM chatbot answering scientific queries**

- Extended similarity search features and optimized RAG retrieval on ELK stack
- Architected migration from Streamlit prototype to React/FastAPI; enabled multi-user concurrent sessions and persistent chat history

</div>

<div class="job" markdown>

### Software Engineer Intern
**[Evertz](https://www.evertz.com)** · May 2021 – Aug 2022 · 1 yr 4 mos · Burlington, ON (Remote)

- Contributed to development of an enterprise Audio/Video routing and device management platform used in production environments
- Worked across web, desktop/mobile, embedded, and automation layers in a cross-functional engineering team
- Built features and test automation supporting device configuration, firmware updates, and system reliability

</div>

---

## Education

<div class="education-item" markdown>

### B.A.Sc, Honours Computer Science Co-op
**[McMaster University](https://www.mcmaster.ca)** · 2018 – 2023 · Hamilton, ON

GPA 3.9 · **Summa Cum Laude** · Dean's Honour List (2018–2023) · Faculty of Engineering Entrance Scholarship

Activities: Student mentor and ambassador for the CS program at the McMaster Engineering Society · Mac Outreach Coding Camp · Associate of Korean Canadian Scientists and Engineers · Guitar Club · Korean Christian Fellowship

</div>

---

## Certifications

<div class="cert-grid">
  <a href="https://credly.com/badges/3e257c53-e321-4de1-8db9-3b3dffe011f2/public_url" class="cert-card" target="_blank" rel="noopener">
    <img src="https://images.credly.com/size/340x340/images/778bde6c-ad1c-4312-ac33-2fa40d50a147/image.png" class="cert-badge" alt="AWS Certified Machine Learning – Specialty">
    <strong>AWS Certified Machine Learning – Specialty</strong>
    <span>Amazon Web Services · Jan 2026 – Jan 2029</span>
  </a>
  <a href="https://credly.com/badges/d9408363-7c18-4336-b8c6-6a85f50b923c/public_url" class="cert-card" target="_blank" rel="noopener">
    <img src="https://images.credly.com/size/340x340/images/bd31ef42-d460-493e-8503-39592aaf0458/image.png" class="cert-badge" alt="AWS Certified DevOps Engineer – Professional">
    <strong>AWS Certified DevOps Engineer – Professional</strong>
    <span>Amazon Web Services · Mar 2025 – Mar 2028</span>
  </a>
  <a href="https://credly.com/badges/90233604-0a21-42ee-8643-e15d32630610/public_url" class="cert-card" target="_blank" rel="noopener">
    <img src="https://images.credly.com/size/340x340/images/0e284c3f-5164-4b21-8660-0d84737941bc/image.png" class="cert-badge" alt="AWS Certified Solutions Architect – Associate">
    <strong>AWS Certified Solutions Architect – Associate</strong>
    <span>Amazon Web Services · Dec 2024 – Dec 2027</span>
  </a>
  <a href="https://achieve.snowflake.com/63500245-592a-4f2c-bb57-26f4841c51ed" class="cert-card" target="_blank" rel="noopener">
    <img src="https://api.eu.badgr.io/public/assertions/63500245-592a-4f2c-bb57-26f4841c51ed/image" class="cert-badge" alt="SnowPro Associate: Platform" onerror="this.src='https://www.snowflake.com/wp-content/themes/snowflake/assets/img/favicon/favicon-196x196.png'">
    <strong>SnowPro Associate: Platform</strong>
    <span>Snowflake · Apr 2026</span>
  </a>
</div>

---

## Projects

| Project | Description | Stack |
|---------|-------------|-------|
| [Flux Infrastructure](projects/flux-infra/index.md) | Kubernetes GitOps homelab | FluxCD, Kustomize |
| [Terraform Infrastructure](projects/terraform-infra/index.md) | Modular cloud infrastructure | Terraform, AWS/GCP |
| [Grafana Dashboards](projects/grafana-dashboards/index.md) | Observability dashboards | Grafana, Prometheus |
| [Agentic AI](projects/agentic-ai/index.md) | AI agent platform with RAG | Python, LangChain |

## Engineering Patterns

Documented patterns and learnings from building production systems:

- [GitOps Patterns](patterns/gitops.md) - Declarative infrastructure management
- [Terraform Module Design](patterns/terraform-modules.md) - Reusable infrastructure components
- [Observability](patterns/observability.md) - Metrics, logging, and tracing strategies
- [Agent Architectures](patterns/agent-architectures.md) - AI agent design patterns
