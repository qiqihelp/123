package com.mchelper.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.mchelper.R
import com.mchelper.data.Command
import com.mchelper.data.CommandRepository

class CommandDetailBottomSheet : BottomSheetDialogFragment() {
    
    private var commandId: String? = null
    
    companion object {
        fun newInstance(commandId: String): CommandDetailBottomSheet {
            return CommandDetailBottomSheet().apply {
                arguments = Bundle().apply { putString("command_id", commandId) }
            }
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        commandId = arguments?.getString("command_id")
    }
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.bottom_sheet_command_detail, container, false)
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        val command = commandId?.let { CommandRepository.getById(it) } ?: return
        
        view.findViewById<TextView>(R.id.text_command_name).text = command.name
        view.findViewById<TextView>(R.id.text_category).text = command.category.displayName
        view.findViewById<TextView>(R.id.text_syntax).text = command.syntax
        view.findViewById<TextView>(R.id.text_description).text = command.description
        
        val syntaxView = view.findViewById<TextView>(R.id.text_syntax)
        syntaxView.setOnClickListener {
            copyToClipboard(command.syntax)
        }
        
        val examplesRecyclerView = view.findViewById<RecyclerView>(R.id.recycler_examples)
        examplesRecyclerView.layoutManager = LinearLayoutManager(requireContext())
        examplesRecyclerView.adapter = ExampleAdapter(command.examples)
        
        if (command.notes.isNotEmpty()) {
            view.findViewById<TextView>(R.id.text_notes).visibility = View.VISIBLE
            view.findViewById<TextView>(R.id.text_notes_content).visibility = View.VISIBLE
            view.findViewById<TextView>(R.id.text_notes_content).text = command.notes
        }
    }
    
    private fun copyToClipboard(text: String) {
        val clipboard = requireContext().getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("command", text)
        clipboard.setPrimaryClip(clip)
        Toast.makeText(requireContext(), "已复制到剪贴板", Toast.LENGTH_SHORT).show()
    }
    
    class ExampleAdapter(private val examples: List<String>) : 
        RecyclerView.Adapter<ExampleAdapter.ViewHolder>() {
        
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_example, parent, false)
            return ViewHolder(view)
        }
        
        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            holder.bind(examples[position])
        }
        
        override fun getItemCount() = examples.size
        
        class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            private val textView: TextView = view.findViewById(R.id.text_example)
            
            fun bind(example: String) {
                textView.text = example
                itemView.setOnClickListener {
                    val clipboard = itemView.context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    val clip = ClipData.newPlainText("command", example.split(" - ")[0])
                    clipboard.setPrimaryClip(clip)
                    Toast.makeText(itemView.context, "已复制", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}
