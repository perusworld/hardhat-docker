import { Alert, Card, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo } from 'react'
import { useContractAbi } from '../hooks/useContractAbi'
import { decodeTransactionInput, type DecodedInputParameter } from '../lib/transactionInput'

type DecodedInputDataProps = {
  data: string
  methodId: string
  to?: string | null
  value: bigint
}

const columns: ColumnsType<DecodedInputParameter> = [
  {
    title: 'Name',
    dataIndex: 'name',
    width: 180,
    render: (name: string) => <Typography.Text code>{name}</Typography.Text>,
  },
  {
    title: 'Type',
    dataIndex: 'type',
    width: 260,
    render: (type: string) => <Typography.Text type="secondary">{type}</Typography.Text>,
  },
  {
    title: 'Value',
    dataIndex: 'value',
    render: (value: string) => (
      <Typography.Paragraph copyable className="decoded-value">
        {value}
      </Typography.Paragraph>
    ),
  },
]

export default function DecodedInputData({ data, methodId, to, value }: DecodedInputDataProps) {
  const contractAbi = useContractAbi(to)
  const abi = contractAbi.abi

  const decoded = useMemo(() => {
    if (!abi) return null

    try {
      return decodeTransactionInput(abi, data, value)
    } catch {
      return null
    }
  }, [abi, data, value])

  if (data === '0x') {
    return (
      <Card title="Decoded Input Data" className="detail-card">
        <Alert type="info" showIcon message="This transaction has no input data." />
      </Card>
    )
  }

  if (!to) {
    return (
      <Card title="Decoded Input Data" className="detail-card">
        <Alert type="info" showIcon message="Contract creation input decoding is not supported yet." />
      </Card>
    )
  }

  if (contractAbi.isLoading) {
    return (
      <Card title="Decoded Input Data" loading className="detail-card">
        Loading ABI
      </Card>
    )
  }

  if (!abi) {
    return (
      <Card title="Decoded Input Data" className="detail-card">
        <Alert
          type="warning"
          showIcon
          message="No ABI found for the receiving contract."
          description="Compile the contract so the backend can read Hardhat artifacts, deploy with Ignition for address mapping, or save the contract ABI manually on the address page."
        />
      </Card>
    )
  }

  if (!decoded) {
    return (
      <Card title="Decoded Input Data" className="detail-card">
        <Alert
          type="warning"
          showIcon
          message="Input data could not be decoded with the available ABI."
          description={`Method ID ${methodId} was not found in the ABI or the input data does not match the ABI.`}
        />
      </Card>
    )
  }

  return (
    <Card title="Decoded Input Data" className="detail-card">
      <div className="decoded-function">
        <Typography.Text type="secondary">Function</Typography.Text>
        <div>
          <Tag color="blue">{decoded.methodId}</Tag>
          <Typography.Text code>{decoded.signature}</Typography.Text>
          {contractAbi.contractMetadata.data?.contractName && (
            <Typography.Text type="secondary" className="decoded-source">
              {contractAbi.contractMetadata.data.contractName} from {contractAbi.contractMetadata.data.sourceName} (
              {contractAbi.source})
            </Typography.Text>
          )}
          {!contractAbi.contractMetadata.data?.contractName && contractAbi.source === 'browser' && (
            <Typography.Text type="secondary" className="decoded-source">
              ABI saved in browser storage
            </Typography.Text>
          )}
        </div>
      </div>
      <Table
        rowKey={(parameter) => parameter.name}
        columns={columns}
        dataSource={decoded.parameters}
        pagination={false}
        scroll={{ x: 860 }}
        size="middle"
      />
    </Card>
  )
}
