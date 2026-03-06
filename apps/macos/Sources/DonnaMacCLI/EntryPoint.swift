import Foundation

private struct RootCommand {
    var name: String
    var args: [String]
}

@main
struct DonnaMacCLI {
    static func main() async {
        let args = Array(CommandLine.arguments.dropFirst())
        let command = parseRootCommand(args)
        switch command?.name {
        case nil:
            printUsage()
        case "-h", "--help", "help":
            printUsage()
        case "connect":
            await runConnect(command?.args ?? [])
        case "discover":
            await runDiscover(command?.args ?? [])
        case "wizard":
            await runWizardCommand(command?.args ?? [])
        default:
            fputs("donna-mac: unknown command\n", stderr)
            printUsage()
            exit(1)
        }
    }
}

private func parseRootCommand(_ args: [String]) -> RootCommand? {
    guard let first = args.first else { return nil }
    return RootCommand(name: first, args: Array(args.dropFirst()))
}

private func printUsage() {
    print("""
    donna-mac

    Usage:
      donna-mac connect [--url <ws://host:port>] [--token <token>] [--password <password>]
                           [--mode <local|remote>] [--timeout <ms>] [--probe] [--json]
                           [--client-id <id>] [--client-mode <mode>] [--display-name <name>]
                           [--role <role>] [--scopes <a,b,c>]
      donna-mac discover [--timeout <ms>] [--json] [--include-local]
      donna-mac wizard [--url <ws://host:port>] [--token <token>] [--password <password>]
                          [--mode <local|remote>] [--workspace <path>] [--json]

    Examples:
      donna-mac connect
      donna-mac connect --url ws://127.0.0.1:18789 --json
      donna-mac discover --timeout 3000 --json
      donna-mac wizard --mode local
    """)
}
