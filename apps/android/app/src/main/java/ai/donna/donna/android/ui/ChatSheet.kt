package ai.donna.android.ui

import androidx.compose.runtime.Composable
import ai.donna.android.MainViewModel
import ai.donna.android.ui.chat.ChatSheetContent

@Composable
fun ChatSheet(viewModel: MainViewModel) {
  ChatSheetContent(viewModel = viewModel)
}
