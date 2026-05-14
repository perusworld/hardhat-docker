import { Alert, Card, Space, Tabs, Tag, Typography } from 'antd'
import { useMemo } from 'react'
import { useStoredAbi } from '../hooks/useStoredAbi'
import { getContractFunctions } from '../lib/contracts'
import { formatInteger } from '../lib/format'
import AbiEditor from './AbiEditor'
import ContractFunctionPanel from './ContractFunctionPanel'

type ContractWorkspaceProps = {
  address: string
  bytecode: string
}

export default function ContractWorkspace({ address, bytecode }: ContractWorkspaceProps) {
  const storedAbi = useStoredAbi(address)
  const abi = storedAbi.data?.abi

  const parsed = useMemo(() => {
    if (!abi) return null

    try {
      return getContractFunctions(abi)
    } catch {
      return null
    }
  }, [abi])

  const byteLength = Math.max((bytecode.length - 2) / 2, 0)

  return (
    <Card title="Contract" className="detail-card">
      <Tabs
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <Space direction="vertical" size={14} className="full-width">
                <Alert
                  type={storedAbi.data ? 'success' : 'warning'}
                  showIcon
                  message={storedAbi.data ? 'ABI saved locally for this contract.' : 'No ABI saved for this contract yet.'}
                />
                <Space wrap>
                  <Tag color="purple">Contract</Tag>
                  <Typography.Text>{formatInteger(byteLength)} byte deployment code</Typography.Text>
                  {parsed && <Typography.Text>{formatInteger(parsed.readFunctions.length)} read functions</Typography.Text>}
                  {parsed && <Typography.Text>{formatInteger(parsed.writeFunctions.length)} write functions</Typography.Text>}
                </Space>
              </Space>
            ),
          },
          {
            key: 'abi',
            label: 'ABI',
            children: <AbiEditor address={address} storedAbi={storedAbi.data} />,
          },
          {
            key: 'read',
            label: 'Read',
            disabled: !storedAbi.data || !parsed,
            children:
              storedAbi.data && parsed ? (
                <ContractFunctionPanel abi={storedAbi.data.abi} address={address} functions={parsed.readFunctions} mode="read" />
              ) : null,
          },
          {
            key: 'write',
            label: 'Write',
            disabled: !storedAbi.data || !parsed,
            children:
              storedAbi.data && parsed ? (
                <ContractFunctionPanel abi={storedAbi.data.abi} address={address} functions={parsed.writeFunctions} mode="write" />
              ) : null,
          },
          {
            key: 'code',
            label: 'Code',
            children: (
              <Space direction="vertical" size={14} className="full-width">
                <div>
                  <Typography.Title level={5}>Deployment Bytecode</Typography.Title>
                  <Typography.Paragraph copyable className="code-block">
                    {bytecode}
                  </Typography.Paragraph>
                </div>
                <div>
                  <Typography.Title level={5}>Saved ABI</Typography.Title>
                  <Typography.Paragraph copyable={Boolean(storedAbi.data?.abi)} className="code-block">
                    {storedAbi.data?.abi ?? 'No ABI saved.'}
                  </Typography.Paragraph>
                </div>
              </Space>
            ),
          },
        ]}
      />
    </Card>
  )
}
