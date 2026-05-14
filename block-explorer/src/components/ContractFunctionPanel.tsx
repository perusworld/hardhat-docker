import { PlayCircleOutlined, SendOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Space, Tag, Typography, message } from 'antd'
import type { ContractFunction } from '../lib/contracts'
import {
  coerceContractInput,
  getReadContract,
  getWriteContract,
  stringifyContractResult,
} from '../lib/contracts'
import HashLink from './HashLink'

type ContractFunctionPanelProps = {
  abi: string
  address: string
  functions: ContractFunction[]
  mode: 'read' | 'write'
}

type FunctionCardProps = ContractFunctionPanelProps & {
  fragment: ContractFunction
}

function FunctionCard({ abi, address, fragment, mode }: FunctionCardProps) {
  const [form] = Form.useForm<Record<string, string>>()
  const [messageApi, contextHolder] = message.useMessage()
  const outputName = `${fragment.name}-output`
  const transactionName = `${fragment.name}-transaction`

  const callFunction = async (values: Record<string, string>) => {
    const args = fragment.inputs.map((input, index) => coerceContractInput(values[input.name || `arg${index}`] ?? '', input))

    try {
      if (mode === 'read') {
        const contract = getReadContract(address, abi)
        const result = await contract[fragment.name](...args)
        form.setFieldValue(outputName, stringifyContractResult(result))
        return
      }

      const contract = await getWriteContract(address, abi)
      const tx = await contract[fragment.name](...args)
      form.setFieldValue(transactionName, tx.hash)
      messageApi.success('Transaction submitted.')
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : `Failed to ${mode === 'read' ? 'call' : 'send'} function.`)
    }
  }

  return (
    <Card
      size="small"
      title={
        <Space wrap>
          <Typography.Text strong>{fragment.name}</Typography.Text>
          <Tag>{fragment.stateMutability}</Tag>
          <Typography.Text type="secondary">{fragment.signature}</Typography.Text>
        </Space>
      }
      className="function-card"
    >
      {contextHolder}
      <Form form={form} layout="vertical" onFinish={callFunction}>
        {fragment.inputs.map((input, index) => {
          const name = input.name || `arg${index}`
          return (
            <Form.Item
              key={`${fragment.signature}-${index}`}
              name={name}
              label={`${name} (${input.format()})`}
              rules={[{ required: true, message: `Enter ${name}.` }]}
            >
              <Input placeholder={input.baseType === 'array' || input.baseType === 'tuple' ? 'JSON value' : input.type} />
            </Form.Item>
          )
        })}

        <Space direction="vertical" size={12} className="full-width">
          <Button
            type={mode === 'write' ? 'primary' : 'default'}
            htmlType="submit"
            icon={mode === 'write' ? <SendOutlined /> : <PlayCircleOutlined />}
          >
            {mode === 'write' ? 'Send Transaction' : 'Call'}
          </Button>

          {mode === 'read' && (
            <Form.Item name={outputName} label="Result">
              <Input.TextArea rows={3} readOnly className="mono-input" />
            </Form.Item>
          )}

          {mode === 'write' && (
            <Form.Item shouldUpdate noStyle>
              {() => {
                const hash = form.getFieldValue(transactionName) as string | undefined
                return hash ? (
                  <Alert
                    type="success"
                    showIcon
                    message="Transaction submitted"
                    description={<HashLink value={hash} route={`/tx/${hash}`} compact={false} />}
                  />
                ) : null
              }}
            </Form.Item>
          )}
        </Space>
      </Form>
    </Card>
  )
}

export default function ContractFunctionPanel({ abi, address, functions, mode }: ContractFunctionPanelProps) {
  if (!functions.length) {
    return <Alert type="info" showIcon message={`No ${mode} functions found in the saved ABI.`} />
  }

  return (
    <Space direction="vertical" size={12} className="full-width">
      {functions.map((fragment) => (
        <FunctionCard key={fragment.signature} abi={abi} address={address} fragment={fragment} functions={functions} mode={mode} />
      ))}
    </Space>
  )
}
