<template>
  <div class="member-code-container">
    <div class="code-display">
      <h2>会员码</h2>
      <div class="qr-code">
        <canvas ref="qrCanvas"></canvas>
      </div>
      <p class="code-text">{{ memberCode }}</p>
      <p class="tip">请向店员出示此码</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import QRCode from 'qrcode';
import { useUserStore } from '../store/user';

export default defineComponent({
  name: 'MemberCode',
  data() {
    return {
      memberCode: ''
    };
  },
  methods: {
    generateQRCode() {
      if (!this.memberCode) return;
      
      const canvas = this.$refs.qrCanvas as HTMLCanvasElement;
      QRCode.toCanvas(canvas, this.memberCode, {
        width: 200,
        margin: 1
      }, (error) => {
        if (error) console.error(error);
      });
    }
  },
  mounted() {
    const userStore = useUserStore();
    const userId = userStore.userInfo?._id;
    
    if (userId) {
      this.memberCode = `${window.location.origin}/member-code/${userId}`;
      this.$nextTick(() => {
        this.generateQRCode();
      });
    }
  }
});
</script>

<style scoped>
.member-code-container {
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f5f5;
}

.code-display {
  background: white;
  padding: 40px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
}

.qr-code {
  margin: 20px 0;
  display: flex;
  justify-content: center;
}

.code-text {
  font-size: 14px;
  color: #666;
  word-break: break-all;
  margin: 10px 0;
}

.tip {
  color: #999;
  font-size: 12px;
  margin-top: 20px;
}
</style>