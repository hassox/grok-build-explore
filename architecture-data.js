/* Grok Build architecture explorer — pure data (no Node APIs).
 * Loaded via classic <script src> so file:// works.
 * window.ARCHITECTURE_DATA is the content model.
 * Descriptions may use light markdown: paragraphs, - / 1. lists, `code`, **bold**.
 */
window.ARCHITECTURE_DATA = {
  "meta": {
    "title": "Grok Build Architecture Explorer",
    "subtitle": "Recursive map of crates, gateways, traits, and entry modes",
    "repo": "grok-build",
    "compositionRoot": "crates/codegen/xai-grok-pager-bin",
    "notes": "Drill into any concern. Each level shows description, related interfaces/traits, and sub-concerns. Leaf nodes note where architectural detail stops."
  },
  "root": {
    "id": "root",
    "title": "Grok Build",
    "summary": "Terminal AI coding agent: full-screen TUI, headless/CI, or ACP-embedded.",
    "description": "Grok Build (binary `grok` / package `xai-grok-pager`) is SpaceXAI's terminal-based AI coding agent. It understands a codebase, edits files, runs shell commands, searches the web, and manages long-running tasks.\n\nThe monorepo wires:\n\n- Composition-root binary → TUI (pager)\n- Agent shell runtime\n- Tool implementations\n- Workspace host\n- Config / auth, MCP, sampling / model loop\n\nEntry modes: interactive TUI, leader/stdio IPC, headless scripting, and Agent Client Protocol (ACP) for editors.",
    "cratePaths": [
      "crates/codegen/xai-grok-pager-bin"
    ],
    "interfaces": [],
    "relations": [
      {
        "to": "composition-root",
        "label": "starts at"
      },
      {
        "to": "pager-tui",
        "label": "presents via"
      },
      {
        "to": "shell-runtime",
        "label": "runs agent in"
      },
      {
        "to": "tools",
        "label": "acts through"
      },
      {
        "to": "workspace",
        "label": "operates on"
      }
    ],
    "children": [
      {
        "id": "composition-root",
        "title": "Composition Root & Binary",
        "summary": "Package that builds the `xai-grok-pager` binary and wires entry modes.",
        "description": "`xai-grok-pager-bin` is the composition-root package. It exists so the binary can link both the full pager library and optional `xai-grok-pager-minimal` without a circular crate dependency.\n\n`main.rs` responsibilities:\n\n- Parse CLI into pager / agent / headless / workspace-management commands\n- Apply endpoint and headless overrides\n- Dispatch to shell entry points (`run_leader`, `run_stdio_agent`, `run_headless`) or the interactive TUI\n- Own jemalloc (feature-gated), auto-update enforcement, and sandbox feature flags",
        "cratePaths": [
          "crates/codegen/xai-grok-pager-bin",
          "crates/codegen/xai-grok-pager/src/app"
        ],
        "interfaces": [
          {
            "name": "PagerArgs / HeadlessArgs / LeaderTargetArgs",
            "kind": "CLI types",
            "crate": "xai-grok-pager::app",
            "description": "Structured CLI surface parsed by the binary and consumed by shell runners.",
            "interactions": "pager-bin main constructs these; shell `run_*` and pager app event loop consume them."
          },
          {
            "name": "run_leader / run_stdio_agent / run_headless",
            "kind": "entry functions",
            "crate": "xai-grok-shell::agent::app",
            "description": "Process-mode entry points for leader IPC server, stdio ACP client, and non-interactive runs.",
            "interactions": "Composition root calls these after config/auth bootstrap; they own the long-lived async runtime."
          }
        ],
        "relations": [
          {
            "to": "entry-modes",
            "label": "selects mode"
          },
          {
            "to": "pager-tui",
            "label": "launches TUI"
          },
          {
            "to": "shell-runtime",
            "label": "launches agent"
          },
          {
            "to": "config-auth",
            "label": "loads config/auth"
          },
          {
            "to": "sandbox",
            "label": "may apply sandbox"
          }
        ],
        "children": [
          {
            "id": "composition-cli-dispatch",
            "title": "CLI command dispatch",
            "summary": "Routes top-level commands: interactive, headless, agent, workspace mgmt, updates.",
            "description": "The binary maps clap/command trees from `xai-grok-pager::app` into concrete runs. Workspace management commands (start/stop workspace server) and update enforcement sit beside agent launch. Early prefetch (models/config) can join before the main UI starts.",
            "cratePaths": [
              "crates/codegen/xai-grok-pager-bin/src/main.rs"
            ],
            "interfaces": [],
            "relations": [
              {
                "to": "entry-modes",
                "label": "feeds"
              }
            ],
            "children": [],
            "leafNote": "Leaf: individual clap subcommand handlers live in pager `app` / shell modules; not every flag is modeled here."
          },
          {
            "id": "composition-link-graph",
            "title": "Link graph & feature flags",
            "summary": "Why pager-bin exists: break circular deps; feature-gate sandbox/jemalloc/minimal.",
            "description": "`minimal` mode depends on the full pager crate for shared types, so the binary package sits above both.\n\nFeatures include:\n\n- `sandbox-enforce`\n- `release-dist`\n- `jemalloc`\n\nTelemetry and version crates are linked for startup identity.",
            "cratePaths": [
              "crates/codegen/xai-grok-pager-bin/Cargo.toml"
            ],
            "interfaces": [],
            "relations": [
              {
                "to": "pager-minimal",
                "label": "optionally links"
              },
              {
                "to": "sandbox",
                "label": "feature-gates"
              }
            ],
            "children": [],
            "leafNote": "Leaf: Cargo features and allocator config only."
          }
        ]
      },
      {
        "id": "pager-tui",
        "title": "TUI / Pager Layer",
        "summary": "Full-screen terminal UI: scrollback, prompt, modals, rendering, slash commands.",
        "description": "`xai-grok-pager` is the interactive product surface. It owns:\n\n- App event loop and agent view\n- Modals, scrollback, input, slash commands\n- Session / startup flows\n- Presentation primitives re-exported from `xai-grok-pager-render` (theme, syntax, glyphs, host terminal)\n\nMinimal mode connects through narrow seams (`minimal_api`, `minimal_hook`) into `xai-grok-pager-minimal`. The TUI is typically a client of the leader/stdio agent rather than owning the model loop itself.",
        "cratePaths": [
          "crates/codegen/xai-grok-pager",
          "crates/codegen/xai-grok-pager-render",
          "crates/codegen/xai-grok-pager-minimal"
        ],
        "interfaces": [
          {
            "name": "minimal_hook / minimal_api",
            "kind": "IoC seams",
            "crate": "xai-grok-pager::minimal_*",
            "description": "Fn-pointer dispatch and read facade so minimal mode plugs into the full pager without scattering minimal code through the crate.",
            "interactions": "pager-minimal calls minimal_api; pager dispatches into minimal via minimal_hook."
          },
          {
            "name": "xai-grok-pager-render re-exports",
            "kind": "presentation layer",
            "crate": "xai-grok-pager-render",
            "description": "Theme, syntax highlighting, terminal host, glyphs, clipboard, link opener — presentation primitives extracted from the pager.",
            "interactions": "Pager UI modules render through these; keep business logic in pager/shell."
          }
        ],
        "relations": [
          {
            "to": "shell-runtime",
            "label": "drives agent via ACP/IPC"
          },
          {
            "to": "entry-modes",
            "label": "one client of"
          },
          {
            "to": "config-auth",
            "label": "reads settings"
          }
        ],
        "children": [
          {
            "id": "pager-app-loop",
            "title": "App event loop & agent view",
            "summary": "Central UI state machine: events, effects, agent view, turn completion.",
            "description": "`app/` holds the interactive runtime:\n\n- Event loop, dispatch, effects\n- `agent_view`, `turn_completion`, modals\n- Roster, subscription, `leader_cluster`, `session_startup`\n\nIt translates user input and agent notifications into screen updates and ACP/IPC requests.",
            "cratePaths": [
              "crates/codegen/xai-grok-pager/src/app"
            ],
            "interfaces": [
              {
                "name": "AgentCmd / Command",
                "kind": "UI command types",
                "crate": "xai-grok-pager::app",
                "description": "Commands the binary and UI use to start agent-related flows.",
                "interactions": "Binary and UI emit; shell runners and agent view consume."
              }
            ],
            "relations": [
              {
                "to": "pager-scrollback",
                "label": "renders into"
              },
              {
                "to": "entry-leader",
                "label": "connects via"
              }
            ],
            "children": [
              {
                "id": "pager-modals-slash",
                "title": "Modals, slash commands, settings",
                "summary": "User-facing command palette, settings panels, project picker, tips.",
                "description": "Slash command handlers, settings views, project picker, notifications, and tips live under pager modules (`slash`, `settings`, `project_picker`, `notifications`). They configure the agent and workspace without implementing tools themselves.",
                "cratePaths": [
                  "crates/codegen/xai-grok-pager/src/slash",
                  "crates/codegen/xai-grok-pager/src/settings"
                ],
                "interfaces": [],
                "relations": [
                  {
                    "to": "config-auth",
                    "label": "edits config"
                  }
                ],
                "children": [],
                "leafNote": "Leaf: individual slash handlers are product UX, not separate architectural gateways."
              }
            ]
          },
          {
            "id": "pager-scrollback",
            "title": "Scrollback, input, search",
            "summary": "Conversation history surface, prompt input, in-buffer search.",
            "description": "Scrollback stores and paints conversation content; input handles the prompt line and image paste; search navigates history. These modules are UI-only consumers of agent stream events.",
            "cratePaths": [
              "crates/codegen/xai-grok-pager/src/scrollback",
              "crates/codegen/xai-grok-pager/src/input",
              "crates/codegen/xai-grok-pager/src/search"
            ],
            "interfaces": [],
            "relations": [
              {
                "to": "pager-render",
                "label": "paints with"
              }
            ],
            "children": [],
            "leafNote": "Leaf: buffer data structures and paint paths."
          },
          {
            "id": "pager-render",
            "title": "Pager render engine",
            "summary": "Themes, syntax, terminal host, glyphs — presentation crate.",
            "description": "`xai-grok-pager-render` is the presentation-primitives crate extracted from the pager. Modules include:\n\n- appearance, theme, syntax\n- terminal, host, glyphs, gboom\n- clipboard, `prompt_images`, `link_opener`\n\nRe-exported at pager crate root so existing `crate::theme` paths keep working.",
            "cratePaths": [
              "crates/codegen/xai-grok-pager-render"
            ],
            "interfaces": [],
            "relations": [],
            "children": [],
            "leafNote": "Leaf: rendering implementation details."
          },
          {
            "id": "pager-minimal",
            "title": "Minimal pager mode",
            "summary": "Scrollback-native lighter UI via pager-minimal + two seams.",
            "description": "`xai-grok-pager-minimal` implements a thinner UI. Integration is intentionally two narrow seams in the full pager crate so most contributors can ignore minimal mode.",
            "cratePaths": [
              "crates/codegen/xai-grok-pager-minimal"
            ],
            "interfaces": [
              {
                "name": "minimal_hook / minimal_api",
                "kind": "seams",
                "crate": "xai-grok-pager",
                "description": "Only minimal-specific surface in the full pager crate.",
                "interactions": "Binary may choose minimal; hooks bridge both crates."
              }
            ],
            "relations": [
              {
                "to": "composition-root",
                "label": "linked by"
              }
            ],
            "children": [],
            "leafNote": "Leaf: minimal render modules."
          },
          {
            "id": "pager-acp-ui",
            "title": "ACP / IDE surface in pager",
            "summary": "Pager-side ACP handlers and IDE-facing integration pieces.",
            "description": "The pager includes ACP-related modules for when the TUI participates as an ACP client or hosts IDE-adjacent flows. Deep protocol handling lives in shell + `xai-acp-lib`.",
            "cratePaths": [
              "crates/codegen/xai-grok-pager/src/acp",
              "crates/codegen/xai-acp-lib"
            ],
            "interfaces": [
              {
                "name": "AcpAgentGatewaySender / Receiver",
                "kind": "gateway types",
                "crate": "xai-acp-lib",
                "description": "Line-buffered ACP message channel used by shell stdio/leader paths.",
                "interactions": "Shell agent app uses gateway for ACP I/O; pager may surface related UX."
              }
            ],
            "relations": [
              {
                "to": "entry-acp",
                "label": "shares protocol with"
              }
            ],
            "children": [],
            "leafNote": "Leaf: see Entry Modes → ACP for protocol gateway."
          }
        ]
      },
      {
        "id": "shell-runtime",
        "title": "Agent Shell Runtime",
        "summary": "Long-lived agent process: sessions, tools bridge, sampling, leader IPC, plugins.",
        "description": "`xai-grok-shell` is the agent runtime and multi-entry host. It owns:\n\n- Agent bootstrap (`agent/`)\n- Session actors and storage\n- Tools bridge into workspace / toolsets\n- Sampling conversation types\n- Leader IPC server / client\n- MCP doctor, plugins, remote / relay\n- Auth integration and terminal runners\n\nConceptually it sits between the TUI/clients and the model + tools + workspace stack.",
        "cratePaths": [
          "crates/codegen/xai-grok-shell",
          "crates/codegen/xai-grok-agent"
        ],
        "interfaces": [
          {
            "name": "MvpAgent",
            "kind": "core agent type",
            "crate": "xai-grok-shell::agent::mvp_agent",
            "description": "In-process agent that owns shared state across clients in leader mode.",
            "interactions": "Leader server routes ACP to MvpAgent; sessions persist under ~/.grok/."
          },
          {
            "name": "Agent / AgentBuilder",
            "kind": "portable agent definition",
            "crate": "xai-grok-agent",
            "description": "Bundles tools, system prompt, reminder policy, compaction policy, and model config for any host.",
            "interactions": "Shell builds Agent via AgentBuilder; workspace binds toolset after agent construction."
          },
          {
            "name": "StorageAdapter",
            "kind": "trait",
            "crate": "xai-grok-shell::session::storage",
            "description": "Persistence seam for session storage backends.",
            "interactions": "Session code writes through StorageAdapter; concrete adapters implement disk/remote stores."
          }
        ],
        "relations": [
          {
            "to": "sampling",
            "label": "samples models via"
          },
          {
            "to": "tools",
            "label": "dispatches tools via"
          },
          {
            "to": "workspace",
            "label": "binds workspace via"
          },
          {
            "to": "mcp",
            "label": "loads MCP via"
          },
          {
            "to": "entry-modes",
            "label": "exposes"
          }
        ],
        "children": [
          {
            "id": "shell-agent-module",
            "title": "Agent module (bootstrap & handlers)",
            "summary": "Config, init, handlers, subagent, roster, proxy, session config.",
            "description": "`shell/src/agent` covers bootstrap (`init`), runtime config, HTTP proxy to chat APIs, roster, subagent orchestration, restore codes, subscription checks, and request handlers. This is where process-level agent identity is assembled before sessions run turns.",
            "cratePaths": [
              "crates/codegen/xai-grok-shell/src/agent"
            ],
            "interfaces": [
              {
                "name": "Config (AgentConfig)",
                "kind": "runtime config",
                "crate": "xai-grok-shell::agent::config",
                "description": "Endpoints, model lists, grok.com WS config, feature toggles for the agent process.",
                "interactions": "Binary applies CLI overrides; init loads and validates; sessions read."
              }
            ],
            "relations": [
              {
                "to": "shell-session",
                "label": "spawns"
              },
              {
                "to": "config-auth",
                "label": "configured by"
              }
            ],
            "children": [
              {
                "id": "shell-subagent",
                "title": "Subagent orchestration",
                "summary": "Spawned child agents with capability modes and isolation.",
                "description": "Shell subagent module coordinates task/subagent lifecycle with tools (`SubagentBackend` in tools) and capability modes from tool-types. Isolation can use worktrees; capability modes restrict tool surfaces.",
                "cratePaths": [
                  "crates/codegen/xai-grok-shell/src/agent/subagent",
                  "crates/codegen/xai-grok-tools/src/implementations/grok_build/task"
                ],
                "interfaces": [
                  {
                    "name": "SubagentBackend",
                    "kind": "trait",
                    "crate": "xai-grok-tools::implementations::grok_build::task",
                    "description": "Backend that spawns/manages subagents for task tools.",
                    "interactions": "Task tools call SubagentBackend; shell implements process-side lifecycle."
                  },
                  {
                    "name": "SubagentCapabilityMode / SubagentIsolationMode",
                    "kind": "enums (tool-types)",
                    "crate": "xai-tool-types",
                    "description": "Capability and isolation modes for spawned subagents.",
                    "interactions": "Shared vocabulary between tool wire types and shell spawn path."
                  }
                ],
                "relations": [
                  {
                    "to": "tools-task",
                    "label": "implements backend for"
                  }
                ],
                "children": [],
                "leafNote": "Leaf: spawn/wait/kill plumbing."
              }
            ]
          },
          {
            "id": "shell-session",
            "title": "Session actor & conversation",
            "summary": "Per-session state: turns, compaction, ACP session, goals, FS watch.",
            "description": "Sessions are the unit of conversation. Modules cover ACP session implementation, compaction, chat persistence, feedback, goal orchestration (planner/strategist/stop detector), file-system watches, fork, export, and command handling. The session actor coordinates sampling events and tool calls for one chat.",
            "cratePaths": [
              "crates/codegen/xai-grok-shell/src/session"
            ],
            "interfaces": [
              {
                "name": "FacetProvider",
                "kind": "trait",
                "crate": "xai-grok-shell::session::unified_list",
                "description": "Provides facets for unified session listing UI/data.",
                "interactions": "List pipelines call FacetProvider implementations for different session sources."
              },
              {
                "name": "RestartActions",
                "kind": "trait",
                "crate": "xai-grok-shell::session::mcp_restart",
                "description": "Actions available when restarting MCP servers mid-session.",
                "interactions": "MCP restart flow depends on RestartActions to avoid hard-wiring UI."
              }
            ],
            "relations": [
              {
                "to": "sampling",
                "label": "issues sample requests"
              },
              {
                "to": "shell-tools-bridge",
                "label": "runs tools through"
              },
              {
                "to": "compaction",
                "label": "compacts via"
              }
            ],
            "children": [
              {
                "id": "compaction",
                "title": "Context compaction",
                "summary": "History/token compaction so long sessions stay within context.",
                "description": "`xai-grok-compaction` (common) plus shell session compaction modules select, rewrite, and summarize history. Agent crate exposes `CompactionPolicy` on the portable Agent object.",
                "cratePaths": [
                  "crates/common/xai-grok-compaction",
                  "crates/codegen/xai-grok-shell/src/session"
                ],
                "interfaces": [
                  {
                    "name": "CompactionPolicy",
                    "kind": "policy type",
                    "crate": "xai-grok-agent",
                    "description": "When and how an Agent compacts conversation history.",
                    "interactions": "AgentBuilder sets policy; session compaction reads it during long turns."
                  }
                ],
                "relations": [
                  {
                    "to": "shell-agent-module",
                    "label": "policy from Agent"
                  }
                ],
                "children": [],
                "leafNote": "Leaf: compaction algorithms and templates."
              },
              {
                "id": "shell-goals",
                "title": "Goal orchestration",
                "summary": "Planner/strategist/stop-detector loop for multi-step goals.",
                "description": "Goal modules (planner, strategist, summarizer, stop detector, role tools) implement structured multi-step goal mode on top of ordinary turns. They classify next steps and bound runaway loops.",
                "cratePaths": [
                  "crates/codegen/xai-grok-shell/src/session"
                ],
                "interfaces": [],
                "relations": [
                  {
                    "to": "sampling",
                    "label": "uses model for plans"
                  }
                ],
                "children": [],
                "leafNote": "Leaf: goal classifier heuristics."
              }
            ]
          },
          {
            "id": "shell-tools-bridge",
            "title": "Shell tools bridge",
            "summary": "Adapts session tool calls into workspace toolsets and notifications.",
            "description": "`shell/src/tools` bridges the session actor to tool execution: tool_context construction, notification_bridge, retry helpers, and config. Tools themselves live in `xai-grok-tools`; this layer supplies session-scoped context and routes results back as stream events.",
            "cratePaths": [
              "crates/codegen/xai-grok-shell/src/tools"
            ],
            "interfaces": [
              {
                "name": "ToolCallContext / SessionContext",
                "kind": "context types",
                "crate": "xai-tool-runtime::context",
                "description": "Per-call and session context passed into Tool::execute.",
                "interactions": "Shell builds contexts; tool runtime and implementations consume them."
              }
            ],
            "relations": [
              {
                "to": "tools",
                "label": "invokes"
              },
              {
                "to": "workspace",
                "label": "binds FinalizedToolset"
              }
            ],
            "children": [],
            "leafNote": "Leaf: bridge glue; see Tools System for Tool trait."
          },
          {
            "id": "shell-terminal",
            "title": "Terminal runners",
            "summary": "Async terminal execution backends for bash/PTY tools.",
            "description": "Terminal module provides `AsyncTerminalRunner` and streaming local terminal with `SessionNotificationSender` so shell tool calls can stream bash output into the session/UI.",
            "cratePaths": [
              "crates/codegen/xai-grok-shell/src/terminal"
            ],
            "interfaces": [
              {
                "name": "AsyncTerminalRunner",
                "kind": "trait",
                "crate": "xai-grok-shell::terminal",
                "description": "Abstract async runner for shell commands in session context.",
                "interactions": "Bash/terminal tools depend on implementations; shell supplies local streaming runner."
              },
              {
                "name": "SessionNotificationSender",
                "kind": "trait",
                "crate": "xai-grok-shell::terminal",
                "description": "Pushes terminal streaming notifications into the session.",
                "interactions": "Terminal runner emits; session/UI consume chunks."
              },
              {
                "name": "TerminalBackend",
                "kind": "trait",
                "crate": "xai-grok-tools::computer::types",
                "description": "Tool-side terminal backend abstraction used by computer/hub tool types.",
                "interactions": "Tools call TerminalBackend; shell/workspace supply concrete backends."
              }
            ],
            "relations": [
              {
                "to": "tools-impl",
                "label": "backs"
              }
            ],
            "children": [],
            "leafNote": "Leaf: PTY and process management details."
          },
          {
            "id": "shell-plugins",
            "title": "Plugins & extensions",
            "summary": "Plugin loading, marketplace, extension points in shell.",
            "description": "Shell `plugin` and `extensions` modules integrate marketplace-installed plugins (`xai-grok-plugin-marketplace`) and runtime extension hooks. Agent crate also has a plugins submodule for agent-definition plugins.",
            "cratePaths": [
              "crates/codegen/xai-grok-shell/src/plugin.rs",
              "crates/codegen/xai-grok-plugin-marketplace",
              "crates/codegen/xai-grok-agent/src/plugins"
            ],
            "interfaces": [],
            "relations": [
              {
                "to": "hooks",
                "label": "related extension surface"
              },
              {
                "to": "config-auth",
                "label": "configured in"
              }
            ],
            "children": [],
            "leafNote": "Leaf: install/scan/catalog of marketplace packages."
          }
        ]
      },
      {
        "id": "tools",
        "title": "Tools System",
        "summary": "Tool implementations, registry, and unified Tool trait runtime.",
        "description": "Tooling spans four layers:\n\n1. **`xai-tool-types`** — schema, description, and subagent wire types\n2. **`xai-tool-protocol`** — Computer Hub JSON-RPC wire types, IDs, capabilities\n3. **`xai-tool-runtime`** — the unified `Tool` trait, dispatch, streaming, and search index\n4. **`xai-grok-tools`** — concrete implementations and registry:\n   - edit, search, terminal, web\n   - MCP `use_tool`, skills, LSP, memory\n   - task / subagent tools\n\nWorkspace binds a finalized toolset into sessions.",
        "cratePaths": [
          "crates/codegen/xai-grok-tools",
          "crates/common/xai-tool-runtime",
          "crates/common/xai-tool-protocol",
          "crates/common/xai-tool-types"
        ],
        "interfaces": [
          {
            "name": "Tool",
            "kind": "trait",
            "crate": "xai-tool-runtime",
            "description": "Canonical tool contract: typed Args/Output, id, description, capabilities, should_list, execute/run streaming.",
            "interactions": "Every tool source implements Tool; ToolDispatch routes by ToolId; runtime only calls execute (default wraps run)."
          },
          {
            "name": "ToolDispatch",
            "kind": "trait",
            "crate": "xai-tool-runtime",
            "description": "Routes tool calls to registered tools.",
            "interactions": "Session/hub invoke dispatch; registry builds the dispatch table from implementations."
          },
          {
            "name": "ToolFamily / ToolDyn / ArcTool",
            "kind": "traits / type erasures",
            "crate": "xai-tool-runtime",
            "description": "Grouping and type-erased handles for heterogeneous tool sets.",
            "interactions": "Registries store ArcTool; families group related tools for listing."
          },
          {
            "name": "ToolSearchIndex",
            "kind": "trait",
            "crate": "xai-tool-runtime (+ tools re-export)",
            "description": "Searchable index of tools for model-facing discovery.",
            "interactions": "Listing/search paths query the index; implementations update on MCP/tool changes."
          },
          {
            "name": "ToolOutput",
            "kind": "trait",
            "crate": "xai-tool-runtime::render",
            "description": "Model-facing content blocks and optional chat-completion responses from tool results.",
            "interactions": "Tool::Output implements ToolOutput; sampler/session format results for the model."
          }
        ],
        "relations": [
          {
            "to": "tool-gateways",
            "label": "wire protocol"
          },
          {
            "to": "workspace",
            "label": "FS/VCS/exec via"
          },
          {
            "to": "mcp",
            "label": "exposes remote tools via"
          },
          {
            "to": "hooks",
            "label": "pre/post tool hooks"
          }
        ],
        "children": [
          {
            "id": "tools-impl",
            "title": "Concrete implementations",
            "summary": "Grok Build tools, codex/opencode ports, web search, LSP, skills, memory.",
            "description": "`implementations/` hosts concrete tools:\n\n- `grok_build` (and concise / hashline variants)\n- `editor_infra`, `read_file`, `search_tool`, `web_search`\n- `use_tool` (MCP), skills, `task_output`\n- memory, LSP\n- vendored-style codex / opencode ports\n\nShared types include `ToolMetadata`, `ApiKeyProvider`, `MemoryBackend`, `ManagedGatewayToolCaller`, `McpResourceProvider`.",
            "cratePaths": [
              "crates/codegen/xai-grok-tools/src/implementations"
            ],
            "interfaces": [
              {
                "name": "ToolMetadata",
                "kind": "trait",
                "crate": "xai-grok-tools::types",
                "description": "Extra metadata beyond the core Tool trait for product tooling.",
                "interactions": "Registry and UI may read ToolMetadata for taxonomy/display."
              },
              {
                "name": "MemoryBackend",
                "kind": "trait",
                "crate": "xai-grok-tools::types",
                "description": "Storage backend for memory tools.",
                "interactions": "Memory tools call MemoryBackend; shell/workspace provide persistence."
              },
              {
                "name": "LspBackend",
                "kind": "trait",
                "crate": "xai-grok-tools::implementations::lsp",
                "description": "Language server process control for LSP tools.",
                "interactions": "LSP tools call LspBackend; implementation manages server lifecycle."
              },
              {
                "name": "ApiKeyProvider",
                "kind": "trait",
                "crate": "xai-grok-tools::types",
                "description": "Supplies API keys for tools that call external services.",
                "interactions": "Web/search tools request keys; config/auth side implements provider."
              },
              {
                "name": "ManagedGatewayToolCaller / McpResourceProvider",
                "kind": "traits",
                "crate": "xai-grok-tools::types::resources",
                "description": "Call managed gateway tools and expose MCP resources.",
                "interactions": "use_tool / resource paths depend on these; MCP stack implements."
              }
            ],
            "relations": [
              {
                "to": "tools-task",
                "label": "includes"
              },
              {
                "to": "tools-edit",
                "label": "includes"
              }
            ],
            "children": [
              {
                "id": "tools-edit",
                "title": "Edit / search / terminal tools",
                "summary": "Primary coding actions: patch files, search, run shell.",
                "description": "Editor infrastructure, hashline/concise edit schemes (`AnchorScheme`), read_file, search_tool, and bash/terminal tools form the daily coding surface. They use AsyncFileSystem and TerminalBackend abstractions and respect sandbox/permission policies from workspace.",
                "cratePaths": [
                  "crates/codegen/xai-grok-tools/src/implementations/editor_infra",
                  "crates/codegen/xai-grok-tools/src/implementations/read_file",
                  "crates/codegen/xai-grok-tools/src/implementations/search_tool"
                ],
                "interfaces": [
                  {
                    "name": "AsyncFileSystem",
                    "kind": "trait",
                    "crate": "xai-grok-workspace / tools::computer",
                    "description": "Async FS operations for tools and workspace.",
                    "interactions": "Tools call FS trait; workspace file_system module implements; computer types mirror for hub."
                  },
                  {
                    "name": "AnchorScheme",
                    "kind": "trait",
                    "crate": "xai-grok-tools::implementations::grok_build_hashline",
                    "description": "How edit anchors are resolved in hashline editing.",
                    "interactions": "Edit tools pick a scheme; implementations locate edit sites."
                  }
                ],
                "relations": [
                  {
                    "to": "workspace-fs",
                    "label": "reads/writes"
                  },
                  {
                    "to": "sandbox",
                    "label": "constrained by"
                  }
                ],
                "children": [],
                "leafNote": "Leaf: per-tool argument schemas and parsers."
              },
              {
                "id": "tools-task",
                "title": "Task / subagent tools",
                "summary": "spawn_subagent-style task tools and wait/kill outputs.",
                "description": "Task tools use shared naming/types from `xai-tool-types` (TaskToolInput, WaitTasks, KillTask, builtin subagent descriptors) and `SubagentBackend` for actual spawn. Capability and isolation modes restrict what child agents can do.",
                "cratePaths": [
                  "crates/codegen/xai-grok-tools/src/implementations/grok_build/task",
                  "crates/common/xai-tool-types/src"
                ],
                "interfaces": [
                  {
                    "name": "SubagentBackend",
                    "kind": "trait",
                    "crate": "xai-grok-tools",
                    "description": "Spawn and manage subagents for task tools.",
                    "interactions": "Tools call backend; shell provides lifecycle implementation."
                  }
                ],
                "relations": [
                  {
                    "to": "shell-subagent",
                    "label": "lifecycle in"
                  }
                ],
                "children": [],
                "leafNote": "Leaf: task wire naming helpers."
              }
            ]
          },
          {
            "id": "tools-registry",
            "title": "Registry & taxonomy",
            "summary": "Builds toolsets, proto conversion, product taxonomy.",
            "description": "`registry/` converts and registers tools (including proto conversion). `tool_taxonomy` classifies tools for product behavior. Persistence and notification modules support durable tool state and UI events.",
            "cratePaths": [
              "crates/codegen/xai-grok-tools/src/registry",
              "crates/codegen/xai-grok-tools/src/tool_taxonomy.rs"
            ],
            "interfaces": [],
            "relations": [
              {
                "to": "tool-gateways",
                "label": "feeds wire registrations"
              }
            ],
            "children": [],
            "leafNote": "Leaf: registration tables."
          },
          {
            "id": "tool-gateways",
            "title": "Tool protocol & hub gateways",
            "summary": "JSON-RPC Computer Hub protocol + runtime contract + tool-types.",
            "description": "Three crates form the gateway between local tools, remote workspace servers, and MCP adapters:\n\n- **`xai-tool-protocol`** — wire protocol (JSON-RPC envelope, method catalog, `ToolErrorWire` / `ToolOutputWire`, registration, session/tool IDs, hook frames)\n- **`xai-tool-runtime`** — in-process contract (`Tool` trait, streams, dispatch)\n- **`xai-computer-hub-sdk`** — `ToolHarness` and connection pooling for hub-mediated remote tools",
            "cratePaths": [
              "crates/common/xai-tool-protocol",
              "crates/common/xai-tool-runtime",
              "crates/common/xai-computer-hub-sdk",
              "crates/common/xai-computer-hub-core",
              "crates/common/xai-computer-hub-mcp-adapter"
            ],
            "interfaces": [
              {
                "name": "ToolRegistration / ToolServerRegistration",
                "kind": "wire structs",
                "crate": "xai-tool-protocol",
                "description": "How tools and servers advertise capabilities on the hub.",
                "interactions": "Servers register; clients list/search tools via protocol methods."
              },
              {
                "name": "ToolHarness",
                "kind": "SDK type",
                "crate": "xai-computer-hub-sdk",
                "description": "Client harness for calling tools over the hub transport.",
                "interactions": "WorkspaceOps proxy mode and WorkspaceClient use ToolHarness for remote RPC."
              },
              {
                "name": "Method / JsonRpc* envelope",
                "kind": "protocol types",
                "crate": "xai-tool-protocol::envelope",
                "description": "JSON-RPC 2.0 envelope and method catalog for hub messages.",
                "interactions": "All hub peers serialize requests/responses through these types."
              }
            ],
            "relations": [
              {
                "to": "workspace-ops",
                "label": "powers proxy mode"
              },
              {
                "to": "mcp",
                "label": "MCP adapter bridges"
              }
            ],
            "children": [],
            "leafNote": "Leaf: individual JSON-RPC method payload structs."
          }
        ]
      },
      {
        "id": "workspace",
        "title": "Workspace Host",
        "summary": "Filesystem, VCS, permissions, sessions, worktrees, hub server.",
        "description": "`xai-grok-workspace` is the host-side environment. It owns:\n\n- Filesystem and git/jj\n- Permissions and folder trust\n- Worktrees and checkpoint / hunk tracking\n- MCP attachment points and hub server wiring\n\nKey handles:\n\n- **`WorkspaceHandle`** — local workspace instance\n- **`WorkspaceOps`** — dual-mode local vs proxy (remote workspace via hub)\n- **`xai-grok-workspace-types`** — shared RPC / event types\n- **`xai-grok-workspace-client`** — thin transport client",
        "cratePaths": [
          "crates/codegen/xai-grok-workspace",
          "crates/codegen/xai-grok-workspace-types",
          "crates/codegen/xai-grok-workspace-client"
        ],
        "interfaces": [
          {
            "name": "WorkspaceHandle",
            "kind": "handle type",
            "crate": "xai-grok-workspace::handle",
            "description": "Public handle to a local workspace instance (drain, bind, metrics).",
            "interactions": "Local WorkspaceOps and sessions hold WorkspaceHandle; connect_local_workspace constructs it."
          },
          {
            "name": "WorkspaceOps / WorkspaceOp",
            "kind": "dual-mode API + trait",
            "crate": "xai-grok-workspace::workspace_ops",
            "description": "Local mode executes WorkspaceOp::execute on handle; proxy mode serializes WorkspaceRpc over hub.",
            "interactions": "Agent/tools call WorkspaceOps; server dispatches same request structs."
          },
          {
            "name": "WorkspaceRpc",
            "kind": "trait",
            "crate": "xai-grok-workspace-types::rpc",
            "description": "Serialize contract with METHOD constant and Response associated type.",
            "interactions": "Request structs implement WorkspaceRpc; client and server share types for compile-time field safety."
          },
          {
            "name": "WorkspaceClient",
            "kind": "client type",
            "crate": "xai-grok-workspace-client",
            "description": "Typed client for hub-proxied workspace.* RPCs without depending on full workspace crate.",
            "interactions": "Proxy WorkspaceOps and external consumers call WorkspaceClient::rpc."
          },
          {
            "name": "SessionContextFactory",
            "kind": "trait",
            "crate": "xai-grok-workspace::config",
            "description": "Factory for session context objects used when opening sessions.",
            "interactions": "Workspace config uses factory to build per-session contexts for tools."
          }
        ],
        "relations": [
          {
            "to": "tools",
            "label": "executes tools in"
          },
          {
            "to": "shell-runtime",
            "label": "bound by agent"
          },
          {
            "to": "hooks",
            "label": "permission/hooks"
          }
        ],
        "children": [
          {
            "id": "workspace-fs",
            "title": "Filesystem & search",
            "summary": "Async FS, content search, gitignore, fs_notify.",
            "description": "`file_system` implements AsyncFileSystem; search RPCs and fuzzy open support tools and UI. fs_notify watches for external changes. Gitignore helpers coordinate ignore rules with tools.",
            "cratePaths": [
              "crates/codegen/xai-grok-workspace/src/file_system",
              "crates/codegen/xai-grok-workspace/src/fs_notify.rs"
            ],
            "interfaces": [
              {
                "name": "AsyncFileSystem",
                "kind": "trait",
                "crate": "xai-grok-workspace::file_system",
                "description": "Async file operations used by tools and workspace ops.",
                "interactions": "Workspace implements; tools and RPCs call through WorkspaceOps/handle."
              }
            ],
            "relations": [
              {
                "to": "tools-edit",
                "label": "serves"
              }
            ],
            "children": [],
            "leafNote": "Leaf: concrete path/IO helpers."
          },
          {
            "id": "workspace-vcs",
            "title": "VCS, hunks, worktrees",
            "summary": "Git/jj status, commits, hunk tracker, fast worktrees.",
            "description": "Session git/jj modules, hunk tracker (`xai-hunk-tracker`), and worktree management (including `xai-fast-worktree` / WorktreeNotificationSender) support checkpoints, reviews, and isolated subagent workspaces.",
            "cratePaths": [
              "crates/codegen/xai-grok-workspace/src/session",
              "crates/codegen/xai-grok-workspace/src/worktree",
              "crates/codegen/xai-hunk-tracker"
            ],
            "interfaces": [
              {
                "name": "WorktreeNotificationSender",
                "kind": "trait",
                "crate": "xai-grok-workspace::worktree",
                "description": "Sends notifications about worktree lifecycle events.",
                "interactions": "Worktree ops emit; UI/session subscribe."
              },
              {
                "name": "HunkTrackerHandle",
                "kind": "handle",
                "crate": "xai-hunk-tracker",
                "description": "Actor handle tracking edit hunks for review/undo.",
                "interactions": "Workspace sessions hold tracker; UI queries summaries via RPC."
              }
            ],
            "relations": [
              {
                "to": "shell-subagent",
                "label": "isolates via worktrees"
              }
            ],
            "children": [],
            "leafNote": "Leaf: git CLI wrappers and worktree DB."
          },
          {
            "id": "workspace-ops",
            "title": "WorkspaceOps dual-mode & RPC surface",
            "summary": "Local execute vs hub proxy; typed request structs.",
            "description": "Every RPC method has a request struct implementing `WorkspaceRpc`.\n\n- **Local mode** — runs `WorkspaceOp::execute` against `WorkspaceHandle` and `FinalizedToolset`\n- **Proxy mode** — serializes through `WorkspaceClient` / `ToolHarness`\n\nThis is the primary gateway for remote workspace servers.",
            "cratePaths": [
              "crates/codegen/xai-grok-workspace/src/workspace_ops.rs",
              "crates/codegen/xai-grok-workspace-types/src/rpc"
            ],
            "interfaces": [
              {
                "name": "WorkspaceOp",
                "kind": "trait",
                "crate": "xai-grok-workspace",
                "description": "Local execution hook on top of WorkspaceRpc wire contract.",
                "interactions": "Each request type implements execute for local mode; proxy skips execute and RPCs."
              }
            ],
            "relations": [
              {
                "to": "tool-gateways",
                "label": "uses ToolHarness"
              },
              {
                "to": "workspace-types",
                "label": "shares types with"
              }
            ],
            "children": [],
            "leafNote": "Leaf: per-method request/response structs."
          },
          {
            "id": "workspace-permission",
            "title": "Permissions, trust, auto-mode",
            "summary": "Folder trust, permission hooks, classifiers.",
            "description": "Permission subsystem gates dangerous operations. `PermissionClassifier` and `PermissionHookTransport` connect to hooks/hub. Folder trust and project config determine what the agent may touch.",
            "cratePaths": [
              "crates/codegen/xai-grok-workspace/src/permission",
              "crates/codegen/xai-grok-workspace/src/folder_trust.rs",
              "crates/codegen/xai-grok-workspace/src/trust.rs"
            ],
            "interfaces": [
              {
                "name": "PermissionClassifier",
                "kind": "trait",
                "crate": "xai-grok-workspace::permission",
                "description": "Classifies operations for allow/deny/ask policies.",
                "interactions": "Permission checks call classifier before tool execution."
              },
              {
                "name": "PermissionHookTransport",
                "kind": "trait",
                "crate": "xai-grok-workspace::permission",
                "description": "Transports permission hook invocations (e.g. over hub).",
                "interactions": "Hub-aware permission path uses transport; local path may short-circuit."
              }
            ],
            "relations": [
              {
                "to": "hooks",
                "label": "fires pre_tool_use"
              },
              {
                "to": "sandbox",
                "label": "pairs with OS sandbox"
              }
            ],
            "children": [],
            "leafNote": "Leaf: policy tables and classifiers."
          },
          {
            "id": "workspace-types",
            "title": "Workspace types & events",
            "summary": "Shared RPC, events, identity types without runtime deps.",
            "description": "`xai-grok-workspace-types` holds serializable RPC request/response types, events, chunks, metadata, and identity — safe for clients that must not depend on the full workspace runtime.",
            "cratePaths": [
              "crates/codegen/xai-grok-workspace-types"
            ],
            "interfaces": [
              {
                "name": "WorkspaceEvent",
                "kind": "event type",
                "crate": "xai-grok-workspace-types",
                "description": "Events emitted by workspace for clients to observe.",
                "interactions": "Workspace publishes; shell/UI subscribe."
              },
              {
                "name": "WorkspaceRpc",
                "kind": "trait",
                "crate": "xai-grok-workspace-types::rpc",
                "description": "METHOD + Response associated type for each RPC.",
                "interactions": "Both ends of the wire share these definitions."
              }
            ],
            "relations": [
              {
                "to": "workspace-client-crate",
                "label": "consumed by"
              }
            ],
            "children": [],
            "leafNote": "Leaf: type-only crate."
          },
          {
            "id": "workspace-client-crate",
            "title": "Workspace client crate",
            "summary": "Thin RPC client + connected-state latch.",
            "description": "Single transport for workspace_rpc channel used by proxy WorkspaceOps and any consumer that cannot depend on xai-grok-workspace. Maps transport errors and optional deadlines.",
            "cratePaths": [
              "crates/codegen/xai-grok-workspace-client"
            ],
            "interfaces": [
              {
                "name": "WorkspaceClient",
                "kind": "client",
                "crate": "xai-grok-workspace-client",
                "description": "Generic rpc core over ToolHarness.",
                "interactions": "Proxy mode and external callers use WorkspaceClient::rpc."
              }
            ],
            "relations": [
              {
                "to": "tool-gateways",
                "label": "transport"
              }
            ],
            "children": [],
            "leafNote": "Leaf: client helpers only."
          },
          {
            "id": "workspace-hub",
            "title": "Workspace hub server",
            "summary": "In-workspace hub for tool servers, sessions, uploads.",
            "description": "hub, hub_server, hub_channel, hub_auth, hub_ids implement the workspace-side Computer Hub. Sessions bind tool servers; uploads and recovery manage durability; diag_server supports diagnostics.",
            "cratePaths": [
              "crates/codegen/xai-grok-workspace/src/hub.rs",
              "crates/codegen/xai-grok-workspace/src/hub_server.rs"
            ],
            "interfaces": [],
            "relations": [
              {
                "to": "tool-gateways",
                "label": "speaks protocol"
              }
            ],
            "children": [],
            "leafNote": "Leaf: connection lifecycle and donate pumps live in computer-hub-sdk."
          }
        ]
      },
      {
        "id": "config-auth",
        "title": "Config & Authentication",
        "summary": "Layered TOML config, managed policy, auth providers, credentials.",
        "description": "**Config** (`xai-grok-config`, `xai-grok-config-types`) merges:\n\n- Managed system config\n- User config\n- Signed requirements\n- macOS MDM\n\n**Auth** (`xai-grok-auth`, shell auth, MCP credentials) provides `HttpAuth` / `AuthCredentialProvider` so HTTP clients and samplers resolve tokens without importing shell types into low-level crates.\n\nPaths resolve via `xai-grok-paths` / config helpers (`GROK_HOME`).",
        "cratePaths": [
          "crates/codegen/xai-grok-config",
          "crates/codegen/xai-grok-config-types",
          "crates/codegen/xai-grok-auth",
          "crates/codegen/xai-grok-paths"
        ],
        "interfaces": [
          {
            "name": "HttpAuth",
            "kind": "trait",
            "crate": "xai-grok-auth::visibility",
            "description": "Minimal auth visibility for HTTP layers.",
            "interactions": "HTTP middleware/clients depend on HttpAuth; shell implements refresh-aware provider."
          },
          {
            "name": "AuthCredentialProvider",
            "kind": "trait",
            "crate": "xai-grok-auth",
            "description": "Credential snapshots for outbound API calls; extends HttpAuth.",
            "interactions": "Sampler BearerResolver and tools ApiKeyProvider patterns align with this seam; shell is primary implementer."
          },
          {
            "name": "BearerResolver / HeaderInjector",
            "kind": "traits",
            "crate": "xai-grok-sampler::config",
            "description": "Inject auth headers into sampling HTTP requests.",
            "interactions": "SamplerConfig holds SharedBearerResolver; shell wires credential provider into resolver."
          }
        ],
        "relations": [
          {
            "to": "sampling",
            "label": "authenticates"
          },
          {
            "to": "mcp",
            "label": "OAuth credentials"
          },
          {
            "to": "shell-runtime",
            "label": "bootstraps"
          }
        ],
        "children": [
          {
            "id": "config-layers",
            "title": "Config merge layers & requirements",
            "summary": "managed_config → user config → signed requirements → MDM.",
            "description": "Merge order (lowest → highest priority):\n\n1. `/etc/grok/managed_config.toml`\n2. `$GROK_HOME/managed_config.toml`\n3. `$GROK_HOME/config.toml`\n4. `$GROK_HOME/requirements.toml` (signed)\n5. `/etc/grok/requirements.toml`\n6. macOS MDM managed preferences\n\nVersion overrides apply per layer. Requirements layers may fail-closed at startup.",
            "cratePaths": [
              "crates/codegen/xai-grok-config/src/loader.rs",
              "crates/codegen/xai-grok-config/src/validation.rs",
              "crates/codegen/xai-grok-config/src/signed_policy"
            ],
            "interfaces": [],
            "relations": [],
            "children": [],
            "leafNote": "Leaf: TOML schema fields in config-types."
          },
          {
            "id": "auth-flow",
            "title": "Auth managers & flows",
            "summary": "Browser login, GrokAuth, AuthManager, static providers.",
            "description": "Shell auth module runs interactive auth flows and manages tokens. `StaticAuthCredentialProvider` supports tests/fixed tokens. MCP has its own OAuth + credentials store under `$GROK_HOME/mcp_credentials.json`.",
            "cratePaths": [
              "crates/codegen/xai-grok-shell/src/auth",
              "crates/codegen/xai-grok-auth"
            ],
            "interfaces": [
              {
                "name": "StaticAuthCredentialProvider",
                "kind": "impl",
                "crate": "xai-grok-auth",
                "description": "Fixed credential provider for non-interactive use.",
                "interactions": "Tests and specialized hosts inject static credentials."
              }
            ],
            "relations": [
              {
                "to": "mcp-oauth",
                "label": "related store"
              }
            ],
            "children": [],
            "leafNote": "Leaf: token refresh middleware details."
          }
        ]
      },
      {
        "id": "mcp",
        "title": "MCP & External Tool Servers",
        "summary": "Model Context Protocol clients, OAuth, transports, wire adapters.",
        "description": "`xai-grok-mcp` quarantines rmcp/reqwest version skew and owns:\n\n- MCP transports (streamable HTTP, child process)\n- Credentials and OAuth browser flow\n- Liveness checks and wire helpers\n\nTools surface MCP via `use_tool` and resource providers. Workspace can attach MCP; shell has `mcp_doctor` and session MCP restart. ACP transport trait supports reverse invocation paths.",
        "cratePaths": [
          "crates/codegen/xai-grok-mcp",
          "crates/codegen/xai-grok-tools/src/implementations/use_tool"
        ],
        "interfaces": [
          {
            "name": "AcpReverseInvoker",
            "kind": "trait",
            "crate": "xai-grok-mcp::acp_transport",
            "description": "Allows ACP-side reverse invocation into MCP-related flows.",
            "interactions": "ACP integration implements invoker; MCP transport calls back when needed."
          },
          {
            "name": "McpResourceProvider",
            "kind": "trait",
            "crate": "xai-grok-tools::types",
            "description": "Exposes MCP resources to tools/UI.",
            "interactions": "MCP client layer implements; tools query resources."
          }
        ],
        "relations": [
          {
            "to": "tools",
            "label": "tools call MCP"
          },
          {
            "to": "config-auth",
            "label": "credentials"
          },
          {
            "to": "tool-gateways",
            "label": "hub MCP adapter"
          }
        ],
        "children": [
          {
            "id": "mcp-transports",
            "title": "Transports & server lifecycle",
            "summary": "HTTP streamable + stdio child process; backoff and liveness.",
            "description": "`servers` module wraps rmcp transports, tool invocation, error classification, managed-MCP refresh. `mcp_http_client` adds backoff around SSE reconnect. `liveness` tracks server health.",
            "cratePaths": [
              "crates/codegen/xai-grok-mcp/src/servers.rs",
              "crates/codegen/xai-grok-mcp/src/liveness.rs",
              "crates/codegen/xai-grok-mcp/src/mcp_http_client.rs"
            ],
            "interfaces": [],
            "relations": [],
            "children": [],
            "leafNote": "Leaf: rmcp adapter internals."
          },
          {
            "id": "mcp-oauth",
            "title": "MCP OAuth & credentials",
            "summary": "Browser OAuth with cross-process dedup; on-disk credential store.",
            "description": "OAuth flow and BYO oauth config from config.toml; credentials file under GROK_HOME. Dedup prevents multiple concurrent browser logins for the same server.",
            "cratePaths": [
              "crates/codegen/xai-grok-mcp/src/oauth.rs",
              "crates/codegen/xai-grok-mcp/src/credentials.rs",
              "crates/codegen/xai-grok-mcp/src/oauth_config.rs"
            ],
            "interfaces": [],
            "relations": [
              {
                "to": "auth-flow",
                "label": "parallel auth path"
              }
            ],
            "children": [],
            "leafNote": "Leaf: OAuth redirect handler details."
          }
        ]
      },
      {
        "id": "sampling",
        "title": "Sampling & Model Loop",
        "summary": "HTTP streaming to models, retry, actor handle, conversation types.",
        "description": "`xai-grok-sampler` extracts streaming + retry from the session into an actor-based API:\n\n1. **Layer 1 — `SamplingClient`** — raw chunk streams\n2. **Layer 2 — stream transforms** — `SamplingEvent`s\n3. **Layer 3 — `SamplerHandle`** — concurrent requests with cancellation\n\nShell `sampling` holds conversation types. Agent definitions choose models; chat-state and sampling-types support structured messages. Doom-loop detection and 401 attribution hooks sit here.",
        "cratePaths": [
          "crates/codegen/xai-grok-sampler",
          "crates/codegen/xai-grok-shell/src/sampling",
          "crates/codegen/xai-grok-sampling-types",
          "crates/codegen/xai-chat-state"
        ],
        "interfaces": [
          {
            "name": "SamplingClient",
            "kind": "client",
            "crate": "xai-grok-sampler",
            "description": "Returns raw chunk streams from model backends.",
            "interactions": "SamplerHandle/actor uses client; shell configures base URLs and auth."
          },
          {
            "name": "SamplerHandle / SamplerActor",
            "kind": "actor API",
            "crate": "xai-grok-sampler",
            "description": "Manages concurrent sample requests with retry and events.",
            "interactions": "Session actor sends sample commands; receives SamplingEvents."
          },
          {
            "name": "BearerResolver / HeaderInjector",
            "kind": "traits",
            "crate": "xai-grok-sampler::config",
            "description": "Auth header injection for sampling HTTP.",
            "interactions": "Implemented using AuthCredentialProvider from auth stack."
          },
          {
            "name": "Auth401AttributionCallback",
            "kind": "trait",
            "crate": "xai-grok-sampler / xai-grok-tools",
            "description": "Callback when 401s need product attribution/logging.",
            "interactions": "Sampler and tools invoke; host registers callback."
          }
        ],
        "relations": [
          {
            "to": "shell-session",
            "label": "driven by session"
          },
          {
            "to": "config-auth",
            "label": "auth headers"
          },
          {
            "to": "shell-agent-module",
            "label": "model config"
          }
        ],
        "children": [
          {
            "id": "sampling-stream",
            "title": "Stream transforms & events",
            "summary": "chat_completions / responses / messages → SamplingEvent.",
            "description": "stream_chat_completions, stream_responses, stream_messages, collect_response normalize backend differences into SamplingEvent / SamplingErrorKind for the session actor.",
            "cratePaths": [
              "crates/codegen/xai-grok-sampler/src/stream",
              "crates/codegen/xai-grok-sampler/src/events.rs"
            ],
            "interfaces": [],
            "relations": [],
            "children": [],
            "leafNote": "Leaf: per-backend chunk parsers."
          },
          {
            "id": "sampling-retry",
            "title": "Retry, metrics, doom loop",
            "summary": "Backoff, rate-limit classification, latency metrics, doom-loop signals.",
            "description": "retry module classifies errors and applies jittered backoff. metrics expose inference latency percentiles. DoomLoopSignalCollector helps detect pathological tool/sample loops.",
            "cratePaths": [
              "crates/codegen/xai-grok-sampler/src/retry.rs",
              "crates/codegen/xai-grok-sampler/src/doom_loop.rs",
              "crates/codegen/xai-grok-sampler/src/metrics.rs"
            ],
            "interfaces": [],
            "relations": [],
            "children": [],
            "leafNote": "Leaf: numeric thresholds and counters."
          }
        ]
      },
      {
        "id": "entry-modes",
        "title": "Entry Modes (Leader / Stdio / Headless / ACP)",
        "summary": "How clients attach to the shared agent: IPC leader, stdio ACP, headless, IDE.",
        "description": "Multiple process roles share one agent architecture. Leader mode runs a long-lived process with Unix-socket IPC and MvpAgent state. Stdio mode speaks ACP over stdin/stdout (TUI and IDE extensions). Headless runs non-interactively for CI/scripting. ACP library provides gateway framing. Auto-update can recycle the leader when idle.",
        "cratePaths": [
          "crates/codegen/xai-grok-shell/src/leader",
          "crates/codegen/xai-grok-shell/src/agent/app.rs",
          "crates/codegen/xai-acp-lib"
        ],
        "interfaces": [
          {
            "name": "connect_or_spawn",
            "kind": "function",
            "crate": "xai-grok-shell::leader",
            "description": "Connect to existing leader or spawn one for this ws URL / env.",
            "interactions": "TUI/clients call connect_or_spawn; leader lock/socket ensure single leader per machine config."
          },
          {
            "name": "ClientMode / ClientCapabilities / LeaderCapabilities",
            "kind": "protocol types",
            "crate": "xai-grok-shell::leader::protocol",
            "description": "Registration handshake between client and leader (stdio vs other, yolo, model defaults).",
            "interactions": "LeaderClient sends LeaderRegistration; server tracks ownership and routes ACP."
          },
          {
            "name": "ControlCommand / ControlPayload",
            "kind": "control protocol",
            "crate": "xai-grok-shell::leader",
            "description": "Out-of-band control messages (shutdown, capabilities) on the leader channel.",
            "interactions": "Leader server and clients exchange control frames beside ACP traffic."
          }
        ],
        "relations": [
          {
            "to": "shell-runtime",
            "label": "hosts agent"
          },
          {
            "to": "pager-tui",
            "label": "TUI is a client"
          },
          {
            "to": "composition-root",
            "label": "selected by binary"
          }
        ],
        "children": [
          {
            "id": "entry-leader",
            "title": "Leader process & IPC",
            "summary": "Single-leader-per-machine Unix socket server; routes multi-client ACP.",
            "description": "Leader owns:\n\n- `MvpAgent` shared state\n- IPC server (request ID namespacing, session ownership)\n- Lock file and transport\n\nClients include TUI, IDE, and headless. Protocol is versioned via `LEADER_PROTOCOL_VERSION`. An auto-update loop can shut down an idle leader for binary upgrade.",
            "cratePaths": [
              "crates/codegen/xai-grok-shell/src/leader/server.rs",
              "crates/codegen/xai-grok-shell/src/leader/client.rs",
              "crates/codegen/xai-grok-shell/src/leader/lock.rs"
            ],
            "interfaces": [
              {
                "name": "LeaderClient / LeaderRegistration",
                "kind": "client API",
                "crate": "xai-grok-shell::leader",
                "description": "Client connection after connect_or_spawn.",
                "interactions": "Pager/binary use LeaderClient to send/receive ACP lines."
              },
              {
                "name": "run_leader / run_leader_server",
                "kind": "entry functions",
                "crate": "xai-grok-shell",
                "description": "Process entry for leader role.",
                "interactions": "Composition root invokes run_leader; server module runs accept loop."
              }
            ],
            "relations": [
              {
                "to": "entry-acp",
                "label": "multiplexes ACP"
              }
            ],
            "children": [],
            "leafNote": "Leaf: socket framing and lock file format."
          },
          {
            "id": "entry-stdio",
            "title": "Stdio agent mode",
            "summary": "ACP over stdin/stdout for TUI attachment and simple hosts.",
            "description": "`run_stdio_agent` bootstraps config/auth and serves ACP on stdio — used when the process is the agent endpoint rather than a thin leader client, or for direct embedding.",
            "cratePaths": [
              "crates/codegen/xai-grok-shell/src/agent/app.rs"
            ],
            "interfaces": [
              {
                "name": "run_stdio_agent",
                "kind": "entry function",
                "crate": "xai-grok-shell::agent::app",
                "description": "Stdio ACP agent process entry.",
                "interactions": "Binary dispatches; uses AcpAgentGateway* for line IO."
              }
            ],
            "relations": [
              {
                "to": "entry-acp",
                "label": "uses ACP framing"
              }
            ],
            "children": [],
            "leafNote": "Leaf: stdio buffering limits."
          },
          {
            "id": "entry-headless",
            "title": "Headless / CI mode",
            "summary": "Non-interactive runs for scripting and automation.",
            "description": "`run_headless` / `run_headless_no_browser` apply HeadlessArgs onto AgentConfig and run without TUI. Test support crate also provides headless process helpers. Suitable for CI and scripted prompts.",
            "cratePaths": [
              "crates/codegen/xai-grok-shell/src/agent/app.rs",
              "crates/codegen/xai-grok-pager/src/headless.rs",
              "crates/codegen/xai-grok-test-support/src/headless.rs"
            ],
            "interfaces": [
              {
                "name": "run_headless",
                "kind": "entry function",
                "crate": "xai-grok-shell::agent::app",
                "description": "Headless agent execution entry.",
                "interactions": "Binary applies HeadlessArgs then calls run_headless."
              }
            ],
            "relations": [
              {
                "to": "composition-cli-dispatch",
                "label": "CLI path"
              }
            ],
            "children": [],
            "leafNote": "Leaf: headless arg field list."
          },
          {
            "id": "entry-acp",
            "title": "ACP gateway library",
            "summary": "Agent Client Protocol framing for editor and multi-client embeds.",
            "description": "`xai-acp-lib` provides gateway sender/receiver, line buffering, message normalize, stdin reader — the shared ACP transport used by shell entry modes. Session ACP conversion lives under shell session modules.",
            "cratePaths": [
              "crates/codegen/xai-acp-lib",
              "crates/codegen/xai-grok-shell/src/session"
            ],
            "interfaces": [
              {
                "name": "AcpAgentGatewaySender / AcpAgentGatewayReceiver",
                "kind": "gateway",
                "crate": "xai-acp-lib",
                "description": "Bidirectional ACP message gateways over async IO.",
                "interactions": "run_stdio_agent and leader routing use these types for JSON-RPC ACP messages."
              }
            ],
            "relations": [
              {
                "to": "shell-session",
                "label": "session ACP impl"
              }
            ],
            "children": [],
            "leafNote": "Leaf: ACP method handlers in session_impl."
          }
        ]
      },
      {
        "id": "hooks",
        "title": "Hooks System",
        "summary": "File-based session/tool hooks with command runners and trust.",
        "description": "`xai-grok-hooks` discovers hooks from `~/.grok/hooks/` and project `.grok/hooks/`, defined in JSON.\n\nEvents:\n\n- `session_start`\n- `pre_tool_use` (can deny; blocking)\n- `post_tool_use`\n- `session_end`\n\nFail-open by default. Dispatcher + matcher select hooks; runner executes child processes. Workspace permission path and product docs treat hooks as the user extension gateway for policy.",
        "cratePaths": [
          "crates/codegen/xai-grok-hooks"
        ],
        "interfaces": [
          {
            "name": "HookEventName / hook registry",
            "kind": "events + discovery API",
            "crate": "xai-grok-hooks",
            "description": "load_hooks discovers registry; hooks_for(event) lists specs.",
            "interactions": "Session/tool pipeline calls dispatcher before/after tool use; config points at hook directories."
          }
        ],
        "relations": [
          {
            "to": "workspace-permission",
            "label": "policy pairing"
          },
          {
            "to": "tools",
            "label": "wraps tool use"
          },
          {
            "to": "shell-plugins",
            "label": "adjacent extensibility"
          }
        ],
        "children": [
          {
            "id": "hooks-runtime",
            "title": "Discovery, dispatch, runner",
            "summary": "Load JSON hooks, match events, run commands, enforce trust.",
            "description": "discovery loads and validates; matcher filters; dispatcher orchestrates; runner spawns commands; trust module gates untrusted hook sources.",
            "cratePaths": [
              "crates/codegen/xai-grok-hooks/src/discovery.rs",
              "crates/codegen/xai-grok-hooks/src/dispatcher.rs",
              "crates/codegen/xai-grok-hooks/src/runner",
              "crates/codegen/xai-grok-hooks/src/trust.rs"
            ],
            "interfaces": [],
            "relations": [],
            "children": [],
            "leafNote": "Leaf: per-event payload JSON shapes."
          }
        ]
      },
      {
        "id": "sandbox",
        "title": "Sandbox & Process Hardening",
        "summary": "OS-level sandbox (Landlock/Seatbelt via nono) applied at startup.",
        "description": "`xai-grok-sandbox` applies once at process start.\n\n- Covers in-process FS and child processes\n- Process network stays open for the LLM API\n- Child network can be restricted\n\nProfiles (e.g. Workspace) and `SandboxManager`; feature `enforce` pulls nono. Composition root feature-gates `sandbox-enforce` for release builds.",
        "cratePaths": [
          "crates/codegen/xai-grok-sandbox"
        ],
        "interfaces": [
          {
            "name": "SandboxManager / ProfileName",
            "kind": "API types",
            "crate": "xai-grok-sandbox",
            "description": "Configure profile, apply to workspace path, install global state.",
            "interactions": "Binary/startup applies sandbox before agent work; tools/children inherit restrictions."
          }
        ],
        "relations": [
          {
            "to": "composition-root",
            "label": "applied at start"
          },
          {
            "to": "workspace-permission",
            "label": "complements"
          },
          {
            "to": "tools-edit",
            "label": "constrains"
          }
        ],
        "children": [
          {
            "id": "sandbox-profiles",
            "title": "Profiles & child network",
            "summary": "Profile loading, deny paths, child_net helpers.",
            "description": "load_sandbox_config, deny lists, child_net helpers, and logging/metrics for violations. When enforce is off, lightweight helpers still compile (including musl).",
            "cratePaths": [
              "crates/codegen/xai-grok-sandbox/src/profiles.rs",
              "crates/codegen/xai-grok-sandbox/src/child_net.rs"
            ],
            "interfaces": [],
            "relations": [],
            "children": [],
            "leafNote": "Leaf: OS-specific nono wiring."
          }
        ]
      },
      {
        "id": "supporting",
        "title": "Supporting Infrastructure",
        "summary": "Telemetry, markdown, memory, models, update, shared utilities.",
        "description": "Cross-cutting crates that are not the main request path but underpin product quality:\n\n- Telemetry / tracing\n- Markdown + Mermaid rendering\n- Memory store and model catalogs\n- Auto-update, file utils, secrets sanitization\n- Prompt queue, circuit breaker, test support\n\n`third_party/` holds the vendored Mermaid stack used by markdown rendering — dependency detail, not first-class product architecture.",
        "cratePaths": [
          "crates/codegen/xai-grok-telemetry",
          "crates/codegen/xai-grok-markdown",
          "crates/codegen/xai-grok-memory",
          "crates/codegen/xai-grok-models",
          "crates/codegen/xai-grok-update",
          "crates/codegen/xai-grok-shared"
        ],
        "interfaces": [],
        "relations": [
          {
            "to": "pager-render",
            "label": "markdown→UI"
          },
          {
            "to": "composition-root",
            "label": "update on start"
          }
        ],
        "children": [
          {
            "id": "supporting-telemetry",
            "title": "Telemetry & tracing",
            "summary": "Unified logging, metrics, trace macros.",
            "description": "`xai-grok-telemetry`, `xai-tracing`, `xai-tracing-macros` instrument shell and workspace. Product commands include trace_cmd in pager.",
            "cratePaths": [
              "crates/codegen/xai-grok-telemetry",
              "crates/common/xai-tracing"
            ],
            "interfaces": [],
            "relations": [],
            "children": [],
            "leafNote": "Leaf: exporter backends."
          },
          {
            "id": "supporting-markdown",
            "title": "Markdown & Mermaid",
            "summary": "Render model markdown and diagrams in the TUI.",
            "description": "`xai-grok-markdown` (+ core) and mermaid stack (`xai-grok-mermaid`, third_party mermaid-to-svg/dagre) feed pager rendering. Treated as presentation support.",
            "cratePaths": [
              "crates/codegen/xai-grok-markdown",
              "crates/codegen/xai-grok-mermaid"
            ],
            "interfaces": [],
            "relations": [
              {
                "to": "pager-render",
                "label": "used by"
              }
            ],
            "children": [],
            "leafNote": "Leaf: third_party diagram engines are dependency detail only."
          },
          {
            "id": "supporting-memory-models-update",
            "title": "Memory, models catalog, auto-update",
            "summary": "Long-term memory, default models JSON, binary update path.",
            "description": "Memory crate backs MemoryBackend tools. Models crate/default_models.json lists available models. Update crate powers auto_update and minimum version enforcement in the composition root and leader.",
            "cratePaths": [
              "crates/codegen/xai-grok-memory",
              "crates/codegen/xai-grok-models",
              "crates/codegen/xai-grok-update"
            ],
            "interfaces": [],
            "relations": [
              {
                "to": "tools-impl",
                "label": "memory tools"
              },
              {
                "to": "entry-leader",
                "label": "leader auto-update"
              }
            ],
            "children": [],
            "leafNote": "Leaf: storage formats and update CDN details."
          },
          {
            "id": "supporting-shared",
            "title": "Shared leaves & build",
            "summary": "file-utils, secrets, env, circuit-breaker, build protoc, test-support.",
            "description": "Small crates pulled by the closure: xai-grok-file-utils, secrets sanitizer, env, http, shell-base, circuit-breaker, token-estimation, sqlite-journal, prompt-queue, xai-proto-build, test-support. They are architectural leaves unless a new gateway forms around them.",
            "cratePaths": [
              "crates/codegen/xai-grok-file-utils",
              "crates/codegen/xai-grok-secrets",
              "crates/common/xai-circuit-breaker",
              "crates/codegen/xai-grok-test-support",
              "crates/build/xai-proto-build"
            ],
            "interfaces": [],
            "relations": [],
            "children": [],
            "leafNote": "Leaf: utility crates — no further architectural drill-down required."
          }
        ]
      }
    ]
  }
};
