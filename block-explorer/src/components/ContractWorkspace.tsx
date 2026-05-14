import { Alert, Card, Space, Tabs, Tag, Typography } from 'antd'
import { useMemo } from 'react'
import { useContractAbi } from '../hooks/useContractAbi'
import { getContractFunctions } from '../lib/contracts'
import { formatInteger } from '../lib/format'
import AbiEditor from './AbiEditor'
import ContractFunctionPanel from './ContractFunctionPanel'

type ContractWorkspaceProps = {
  address: string
  bytecode: string
}

export default function ContractWorkspace({ address, bytecode }: ContractWorkspaceProps) {
  const contractAbi = useContractAbi(address)
  const abi = contractAbi.abi

  const parsed = useMemo(() => {
    if (!abi) return null

    try {
      return getContractFunctions(abi)
    } catch {
      return null
    }
  }, [abi])

  const byteLength = Math.max((bytecode.length - 2) / 2, 0)
  const contractName = contractAbi.contractMetadata.data?.contractName
  const sourceName = contractAbi.contractMetadata.data?.sourceName
  const hasArtifactAbi = Boolean(contractAbi.source && contractAbi.source !== 'browser')
  const abiStatus = contractAbi.isLoading
    ? 'Loading ABI metadata.'
    : hasArtifactAbi
    ? `ABI loaded from ${contractName ?? 'artifact'}${sourceName ? ` in ${sourceName}` : ''}.`
    : contractAbi.storedAbi.data
      ? 'Using ABI saved in browser storage.'
      : 'No ABI found for this contract yet.'

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
                  type={contractAbi.isLoading ? 'info' : abi ? 'success' : 'warning'}
                  showIcon
                  message={abiStatus}
                />
                <Space wrap>
                  <Tag color="purple">Contract</Tag>
                  {contractAbi.source && <Tag color={hasArtifactAbi ? 'blue' : 'default'}>{contractAbi.source}</Tag>}
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
            children: (
              <AbiEditor
                address={address}
                backendAbi={hasArtifactAbi ? abi : undefined}
                backendLabel={hasArtifactAbi ? abiStatus : undefined}
                storedAbi={contractAbi.storedAbi.data}
              />
            ),
          },
          {
            key: 'read',
            label: 'Read',
            disabled: !abi || !parsed,
            children:
              abi && parsed ? (
                <ContractFunctionPanel abi={abi} address={address} functions={parsed.readFunctions} mode="read" />
              ) : null,
          },
          {
            key: 'write',
            label: 'Write',
            disabled: !abi || !parsed,
            children:
              abi && parsed ? (
                <ContractFunctionPanel abi={abi} address={address} functions={parsed.writeFunctions} mode="write" />
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
                  <Typography.Title level={5}>Active ABI</Typography.Title>
                  <Typography.Paragraph copyable={Boolean(abi)} className="code-block">
                    {abi ?? 'No ABI found.'}
                  </Typography.Paragraph>
                </div>
                <div>
                  <Typography.Title level={5}>Browser Fallback ABI</Typography.Title>
                  <Typography.Paragraph copyable={Boolean(contractAbi.storedAbi.data?.abi)} className="code-block">
                    {contractAbi.storedAbi.data?.abi ?? 'No ABI saved in browser storage.'}
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
