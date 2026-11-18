# hhc-std-mcp

MCP server for searching and downloading Chinese industry standards from the [全国标准信息公共服务平台](https://hbba.sacinfo.org.cn).

## Tools

| Tool | Description |
|------|-------------|
| `search_standards` | Search by keyword, industry, ministry, status |
| `download_standard` | Download a standard as PDF (by ID) |

## Usage

```bash
npx -y hhc-std-mcp
```

## MCP Client Configuration

### Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "hhc-std": {
      "command": "npx",
      "args": ["-y", "hhc-std-mcp"]
    }
  }
}
```

### Cursor / VS Code

```json
{
  "mcp": {
    "hhc-std": {
      "command": "npx",
      "args": ["-y", "hhc-std-mcp"]
    }
  }
}
```

## Examples

Search 通信 industry standards:
```
search_standards(keyword="通信管道", industry="通信", status="现行")
```

Download a standard:
```
download_standard(id="80537ba4c5ce42819780eea31b5adb272aae60d379ecbb3b6910413fe015b26e")
```

## License

MIT
