import { DeleteOutlined, SaveOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Space, Typography, message } from 'antd'
import { useEffect } from 'react'
import { useDeleteStoredAbi, useSaveStoredAbi } from '../hooks/useStoredAbi'
import type { StoredAbi } from '../lib/abiStore'

type AbiEditorProps = {
  address: string
  backendAbi?: string
  backendLabel?: string
  storedAbi?: StoredAbi
}

export default function AbiEditor({ address, backendAbi, backendLabel, storedAbi }: AbiEditorProps) {
  const [form] = Form.useForm<{ abi: string }>()
  const saveAbi = useSaveStoredAbi(address)
  const deleteAbi = useDeleteStoredAbi(address)
  const [messageApi, contextHolder] = message.useMessage()

  useEffect(() => {
    form.setFieldValue('abi', storedAbi?.abi ?? '')
  }, [form, storedAbi?.abi])

  const handleSave = async ({ abi }: { abi: string }) => {
    try {
      await saveAbi.mutateAsync(abi)
      messageApi.success('ABI saved for this contract.')
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : 'Failed to save ABI.')
    }
  }

  const handleDelete = async () => {
    await deleteAbi.mutateAsync()
    form.setFieldValue('abi', '')
    messageApi.success('ABI removed.')
  }

  return (
    <Card title="Contract ABI" className="detail-card">
      {contextHolder}
      <Space direction="vertical" size={14} className="full-width">
        <Alert
          type="info"
          showIcon
          message={
            backendAbi
              ? 'This contract has an artifact ABI. Browser storage is only used as a fallback when the backend cannot resolve an ABI.'
              : 'Paste a JSON ABI array or a compiler artifact with an abi field to use as a browser fallback.'
          }
        />
        {backendAbi && (
          <div>
            <Typography.Title level={5}>Artifact ABI</Typography.Title>
            {backendLabel && <Typography.Paragraph type="secondary">{backendLabel}</Typography.Paragraph>}
            <Typography.Paragraph copyable className="code-block">
              {backendAbi}
            </Typography.Paragraph>
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="abi"
            label="ABI JSON"
            rules={[{ required: true, message: 'Paste a contract ABI.' }]}
          >
            <Input.TextArea rows={12} spellCheck={false} className="mono-input" />
          </Form.Item>
          <Space wrap>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saveAbi.isPending}>
              Save ABI
            </Button>
            <Button danger icon={<DeleteOutlined />} disabled={!storedAbi} loading={deleteAbi.isPending} onClick={handleDelete}>
              Remove ABI
            </Button>
            {storedAbi && (
              <Typography.Text type="secondary">
                Last saved {new Date(storedAbi.updatedAt).toLocaleString()}
              </Typography.Text>
            )}
          </Space>
        </Form>
      </Space>
    </Card>
  )
}
